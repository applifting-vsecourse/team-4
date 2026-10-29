import {
  participantRegistrationSchema,
  type ParticipantRegistration,
} from "@/features/registrations/api/participantRegistrationSchemas"

// Preview data for the participant's own registrations, parsed with the API
// schema so it can't drift from the contract.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const SUMMER_CAMP = {
  name: "Letní tábor Modrá Hora 2027",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko",
}

/** Confirmed for July, partly paid, waitlisted for August. */
export const OWN_REGISTRATION: ParticipantRegistration = participantRegistrationSchema.parse({
  id: uuid(1),
  receivedAt: "2027-03-02T09:15:00.000Z",
  event: SUMMER_CAMP,
  terms: [
    {
      termId: uuid(101),
      label: "Turnus 1",
      startDate: "2027-07-04",
      endDate: "2027-07-17",
      priceMinor: 450_000,
      status: "confirmed",
    },
    {
      termId: uuid(102),
      label: "Turnus 2",
      startDate: "2027-08-01",
      endDate: "2027-08-14",
      priceMinor: 450_000,
      status: "waitlisted",
    },
  ],
  selectedPriceMinor: 900_000,
  amountDueMinor: 450_000,
  paidMinor: 200_000,
  balanceMinor: 250_000,
  paymentInstructions: {
    amountMinor: 250_000,
    variableSymbol: "2700001",
    account: { prefix: null, number: "2501234567", bankCode: "2010" },
    reminderAt: "2027-03-16T09:15:00.000Z",
  },
  payments: [{ id: uuid(501), receivedOn: "2027-03-05", amountMinor: 200_000 }],
})

/** A settled registration of another event. */
export const SETTLED_REGISTRATION: ParticipantRegistration = participantRegistrationSchema.parse({
  id: uuid(6),
  receivedAt: "2027-02-11T18:40:00.000Z",
  event: { name: "Jarní výlet na Sněžku", location: "Pec pod Sněžkou" },
  terms: [
    {
      termId: uuid(104),
      label: "Sobota",
      startDate: "2027-04-17",
      endDate: "2027-04-17",
      priceMinor: 35_000,
      status: "confirmed",
    },
  ],
  selectedPriceMinor: 35_000,
  amountDueMinor: 35_000,
  paidMinor: 35_000,
  balanceMinor: 0,
  paymentInstructions: null,
  payments: [{ id: uuid(502), receivedOn: "2027-02-14", amountMinor: 35_000 }],
})

export const OWN_REGISTRATIONS: ParticipantRegistration[] = [OWN_REGISTRATION, SETTLED_REGISTRATION]
