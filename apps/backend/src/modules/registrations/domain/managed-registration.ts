import {
  answerOf,
  needsDetermination,
} from '@/modules/accommodation/domain/determination';
import {
  HardAttribute,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';
import { Gender } from '@/modules/registrations/domain/gender';
import {
  amountDueMinor,
  ParticipationStatus,
  RegistrationTermResult,
  selectedPriceMinor,
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

/** Entered by the organizer, or paid through the QR link (F21-1). */
export type PaymentSource = 'organizer' | 'qr_link';

export const PAYMENT_SOURCES: readonly PaymentSource[] = [
  'organizer',
  'qr_link',
];

export type ReceivedPayment = {
  id: string;
  /** Calendar date the money arrived, yyyy-MM-dd. */
  receivedOn: string;
  amountMinor: number;
  source: PaymentSource;
};

/** What the list filters on; term and status match on the same term (§3.10). */
export type RegistrationFilter = {
  termId?: string;
  status?: ParticipationStatus;
  payment?: PaymentState;
};

/** The event's hard attribute and the organizer's determination (S3-01). */
export type AccommodationInputs = {
  hardAttribute: HardAttribute | null;
  manualValue: ManualValue | null;
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
    /** Voluntary answer for accommodation (F64); null when not answered. */
    public readonly gender: Gender | null,
    /** The own words for `other`; null otherwise. */
    public readonly genderOther: string | null,
    private readonly accommodation: AccommodationInputs,
  ) {}

  /**
   * The organizer decides the accommodation by hand (F64): only while a hard
   * attribute applies and the participant has no effective value (S3-01).
   */
  get requiresManualAccommodation(): boolean {
    const hard = this.accommodation.hardAttribute;
    return needsDetermination(
      hard,
      hard ? answerOf(hard.attribute, this) : null,
      this.accommodation.manualValue,
    );
  }

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
