import { Gender } from '@/modules/registrations/domain/gender';
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
  selectedPriceMinor,
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
    private readonly paymentToken: string,
    /** The participant's data; the e-mail is the identity and never changes. */
    public readonly contact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      /** Voluntary answer for accommodation (F64); null when not answered. */
      gender: Gender | null;
      /** The own words for `other`; null otherwise. */
      genderOther: string | null;
    },
    /** Bumped by every executed change (F35-2a). */
    public readonly version: number,
    /** A change waits for the organizer's decision. */
    public readonly hasPendingChange: boolean,
  ) {}

  /** Every term released. */
  get isCancelled(): boolean {
    return this.terms.every((term) => term.status === 'cancelled');
  }

  /** Changes are offered for an active registration without a waiting request. */
  get canChange(): boolean {
    return !this.isCancelled && !this.hasPendingChange;
  }

  /** Price of the selected terms; waitlisted ones included. */
  get selectedPriceMinor(): number {
    return selectedPriceMinor(this.terms);
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

  /** Token of the QR payment link; null when nothing is left to pay. */
  get paymentLinkToken(): string | null {
    return this.balanceMinor > 0 ? this.paymentToken : null;
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
