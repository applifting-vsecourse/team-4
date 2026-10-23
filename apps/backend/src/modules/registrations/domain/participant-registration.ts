import {
  PaymentState,
  paymentState,
  ReceivedPayment,
} from '@/modules/registrations/domain/managed-registration';
import {
  amountDueMinor,
  BankAccount,
  EventSummary,
  PaymentInstructions,
  RegistrationTermResult,
} from '@/modules/registrations/domain/registration';

/**
 * A registration as its own participant reads it (S2-14): the event, every
 * term with its own status, and the payment summary. Payment never changes
 * the participation status.
 */
export class ParticipantRegistrationModel {
  constructor(
    public readonly id: string,
    public readonly receivedAt: Date,
    public readonly event: EventSummary,
    /** By term start. */
    public readonly terms: RegistrationTermResult[],
    public readonly variableSymbol: string,
    public readonly account: BankAccount,
    /** As stored by S2-16; null while nothing is due. */
    private readonly storedReminderAt: Date | null,
    /** By the day received, then as recorded. */
    public readonly payments: ReceivedPayment[],
  ) {}

  /** Price of the selected terms; waitlisted ones included. */
  get selectedPriceMinor(): number {
    return this.terms.reduce((sum, term) => sum + term.priceMinor, 0);
  }

  /** Σ confirmed terms (S2-16). */
  get amountDueMinor(): number {
    return amountDueMinor(this.terms);
  }

  get paidMinor(): number {
    return this.payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
  }

  /** Positive is a debt, zero settled, negative an overpayment. */
  get balanceMinor(): number {
    return this.amountDueMinor - this.paidMinor;
  }

  get paymentState(): PaymentState {
    return paymentState(this.amountDueMinor, this.paidMinor);
  }

  /**
   * Only while something is still owed: the remaining amount, where to pay
   * and the reminder date. Null at zero obligation or when settled, so
   * nothing asks the participant to pay.
   */
  get paymentInstructions(): PaymentInstructions | null {
    if (this.balanceMinor <= 0 || !this.storedReminderAt) return null;
    return {
      amountMinor: this.balanceMinor,
      variableSymbol: this.variableSymbol,
      account: this.account,
      reminderAt: this.storedReminderAt,
    };
  }
}
