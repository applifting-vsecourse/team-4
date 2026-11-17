import {
  eventPaymentsSchema,
  registrationDetailSchema,
  registrationListSchema,
  registrationSummarySchema,
  type EventPayments,
  type RegistrationDetail,
  type RegistrationList,
  type RegistrationSummary,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { NO_NEEDS } from "@/features/registrations/api/registrationSchemas"

// Preview and test data for registrations. Every factory parses its result
// with the API schema, so a fixture that no longer matches the contract fails
// loudly instead of rendering a state the server cannot produce. Values are
// fixed (no Date.now(), no random ids) so stories render the same every time.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

export const TERM_JULY = {
  termId: uuid(101),
  label: "Turnus 1",
  startDate: "2027-07-04",
  endDate: "2027-07-17",
  priceMinor: 450_000,
  status: "confirmed",
} as const

export const TERM_AUGUST = {
  termId: uuid(102),
  label: "Turnus 2",
  startDate: "2027-08-01",
  endDate: "2027-08-14",
  priceMinor: 450_000,
  status: "waitlisted",
} as const

export function makeRegistrationSummary(
  overrides: Partial<RegistrationSummary> = {},
): RegistrationSummary {
  return registrationSummarySchema.parse({
    id: uuid(1),
    receivedAt: "2027-03-02T09:15:00.000Z",
    firstName: "Anna",
    lastName: "Nováková",
    email: "anna.novakova@example.cz",
    phone: "+420 601 234 567",
    terms: [TERM_JULY],
    amountDueMinor: 450_000,
    paidMinor: 0,
    balanceMinor: 450_000,
    paymentState: "unpaid",
    ...overrides,
  })
}

/** One registration in every payment state, oldest first, as the server sorts them. */
export function makeRegistrationList(
  registrations: RegistrationSummary[] = [
    makeRegistrationSummary(),
    makeRegistrationSummary({
      id: uuid(2),
      receivedAt: "2027-03-03T17:40:00.000Z",
      firstName: "Jakub",
      lastName: "Dvořák",
      email: "jakub.dvorak@example.cz",
      paidMinor: 200_000,
      balanceMinor: 250_000,
      paymentState: "partial",
    }),
    makeRegistrationSummary({
      id: uuid(3),
      receivedAt: "2027-03-05T07:05:00.000Z",
      firstName: "Eliška",
      lastName: "Svobodová",
      email: "eliska.svobodova@example.cz",
      paidMinor: 450_000,
      balanceMinor: 0,
      paymentState: "paid",
    }),
    makeRegistrationSummary({
      id: uuid(4),
      receivedAt: "2027-03-06T12:30:00.000Z",
      firstName: "Tomáš",
      lastName: "Černý",
      email: "tomas.cerny@example.cz",
      paidMinor: 500_000,
      balanceMinor: -50_000,
      paymentState: "overpaid",
    }),
    makeRegistrationSummary({
      id: uuid(5),
      receivedAt: "2027-03-08T20:10:00.000Z",
      firstName: "Klára",
      lastName: "Procházková",
      email: "klara.prochazkova@example.cz",
      terms: [TERM_AUGUST],
      amountDueMinor: 0,
      balanceMinor: 0,
      paymentState: "none",
    }),
  ],
): RegistrationList {
  return registrationListSchema.parse({ total: registrations.length, registrations })
}

export function makeRegistrationDetail(
  overrides: Partial<RegistrationDetail> = {},
): RegistrationDetail {
  return registrationDetailSchema.parse({
    ...makeRegistrationSummary(),
    selectedPriceMinor: 450_000,
    reminderAt: "2027-03-16T09:15:00.000Z",
    variableSymbol: "2700001",
    payments: [],
    needs: NO_NEEDS,
    version: 0,
    gender: "female",
    genderOther: null,
    requiresManualAccommodation: false,
    ...overrides,
  })
}

// The payments overview (S4-09) is derived from the list above, so its amounts
// and links match what the registration list and detail show. Variable symbols
// match the bank transaction fixtures.
const paymentRegistration = (registration: RegistrationSummary, index: number) => ({
  id: registration.id,
  firstName: registration.firstName,
  lastName: registration.lastName,
  variableSymbol: registration.amountDueMinor > 0 ? `100${index + 1}` : null,
})

const balancesOf = (registrations: RegistrationSummary[]) =>
  registrations.flatMap((registration, index) =>
    registration.paymentState === "none"
      ? []
      : [
          {
            registration: paymentRegistration(registration, index),
            amountDueMinor: registration.amountDueMinor,
            paidMinor: registration.paidMinor,
            balanceMinor: registration.balanceMinor,
            paymentState: registration.paymentState,
          },
        ],
  )

/** Payments of the partial, the paid and the overpaid registration, newest first. */
export function makeEventPayments(): EventPayments {
  const registrations = makeRegistrationList().registrations
  const of = (index: number) => {
    const registration = registrations[index]
    if (!registration) throw new Error(`The registration list has no row ${index}`)
    return paymentRegistration(registration, index)
  }
  return eventPaymentsSchema.parse({
    payments: [
      {
        id: uuid(803),
        receivedOn: "2027-03-15",
        amountMinor: 450_000,
        source: "organizer",
        registration: of(2),
      },
      {
        id: uuid(805),
        receivedOn: "2027-03-12",
        amountMinor: 50_000,
        source: "qr_link",
        registration: of(3),
      },
      {
        id: uuid(802),
        receivedOn: "2027-03-09",
        amountMinor: 200_000,
        source: "organizer",
        registration: of(1),
      },
      {
        id: uuid(804),
        receivedOn: "2027-03-07",
        amountMinor: 450_000,
        source: "organizer",
        registration: of(3),
      },
    ],
    balances: balancesOf(registrations),
  })
}

/** Nothing received yet: every registration with an obligation still owes all of it. */
export function makeEventWithoutPayments(): EventPayments {
  const unpaid = makeRegistrationList().registrations.map((registration) =>
    registration.paymentState === "none"
      ? registration
      : {
          ...registration,
          paidMinor: 0,
          balanceMinor: registration.amountDueMinor,
          paymentState: "unpaid" as const,
        },
  )
  return eventPaymentsSchema.parse({ payments: [], balances: balancesOf(unpaid) })
}
