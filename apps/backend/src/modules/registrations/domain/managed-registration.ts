import {
  amountDueMinor,
  ParticipationStatus,
  RegistrationTermResult,
} from '@/modules/registrations/domain/registration';

/** How a whole registration stands with its payments (data-model.md §3.9). */
export type PaymentState = 'none' | 'unpaid' | 'partial' | 'paid' | 'overpaid';

export const PAYMENT_STATES: readonly PaymentState[] = [
  'none',
  'unpaid',
  'partial',
  'paid',
  'overpaid',
];

/**
 * `none` is nothing due and nothing paid. A payment against a zero obligation
 * is an overpayment, never `none` (S2-11, S2-12).
 */
export const paymentState = (
  dueMinor: number,
  paidMinor: number,
): PaymentState => {
  if (paidMinor > dueMinor) return 'overpaid';
  if (dueMinor === 0) return 'none';
  if (paidMinor === 0) return 'unpaid';
  return paidMinor < dueMinor ? 'partial' : 'paid';
};

export type ReceivedPayment = {
  id: string;
  /** Calendar date the money arrived, yyyy-MM-dd. */
  receivedOn: string;
  amountMinor: number;
};

/** What the list filters on; term and status match on the same term (§3.10). */
export type RegistrationFilter = {
  termId?: string;
  status?: ParticipationStatus;
  payment?: PaymentState;
};

/** A registration as its organizer sees it (S2-11), with the derived amounts. */
export class ManagedRegistrationModel {
  constructor(
    public readonly id: string,
    public readonly receivedAt: Date,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly phone: string,
    /** By term start. */
    public readonly terms: RegistrationTermResult[],
    public readonly variableSymbol: string,
    /** As stored by S2-16; null while nothing is due. */
    private readonly storedReminderAt: Date | null,
    /** By the day received, then as recorded. */
    public readonly payments: ReceivedPayment[],
  ) {}

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

  /** At most one per registration, and none without an obligation. */
  get reminderAt(): Date | null {
    return this.amountDueMinor > 0 ? this.storedReminderAt : null;
  }
}

export type RegistrationList = {
  /** All registrations of the event, so "no match" is told from "none yet". */
  total: number;
  registrations: ManagedRegistrationModel[];
};
