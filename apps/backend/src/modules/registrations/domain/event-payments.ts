import {
  ManagedRegistrationModel,
  PaymentState,
  ReceivedPayment,
} from '@/modules/registrations/domain/managed-registration';

/** Who a payment or a balance belongs to, as the organizer recognizes it. */
export type PaymentRegistration = {
  id: string;
  firstName: string;
  lastName: string;
  /** Null while nothing is due, as in the registration detail. */
  variableSymbol: string | null;
};

/** A received payment of the event, with the registration it was recorded to. */
export type EventPayment = ReceivedPayment & {
  registration: PaymentRegistration;
};

/** The amounts of one registration, computed as in the registration list (S2-11). */
export type RegistrationBalance = {
  registration: PaymentRegistration;
  amountDueMinor: number;
  paidMinor: number;
  balanceMinor: number;
  paymentState: PaymentState;
};

/** Správa akce → Platby (S4-09): the received payments and balances of one event. */
export type EventPayments = {
  /** Newest first: by the day received, then the latest recorded. */
  payments: EventPayment[];
  /** Registrations with something due or paid, in the registration list's order. */
  balances: RegistrationBalance[];
};

const registrationOf = (
  registration: ManagedRegistrationModel,
): PaymentRegistration => ({
  id: registration.id,
  firstName: registration.firstName,
  lastName: registration.lastName,
  variableSymbol:
    registration.amountDueMinor > 0 ? registration.variableSymbol : null,
});

/**
 * Derives the overview from the registrations themselves, so its amounts are
 * the ones the registration list and detail show. A registration with nothing
 * due and nothing paid has no balance to watch and is left out.
 */
export const eventPayments = (
  registrations: readonly ManagedRegistrationModel[],
): EventPayments => {
  const payments = registrations
    .flatMap((registration) =>
      registration.payments.map((payment) => ({
        ...payment,
        registration: registrationOf(registration),
      })),
    )
    .sort(
      (a, b) =>
        b.receivedOn.localeCompare(a.receivedOn) ||
        // Payment ids are UUIDv7, so a later recorded one sorts higher.
        b.id.localeCompare(a.id),
    );

  const balances = registrations
    .filter((registration) => registration.paymentState !== 'none')
    .map((registration) => ({
      registration: registrationOf(registration),
      amountDueMinor: registration.amountDueMinor,
      paidMinor: registration.paidMinor,
      balanceMinor: registration.balanceMinor,
      paymentState: registration.paymentState,
    }));

  return { payments, balances };
};
