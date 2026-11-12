import {
  qrPaymentPageSchema,
  type QrPaymentPage,
} from "@/features/registrations/api/qrPaymentSchemas"
import {
  registrationResultSchema,
  type RegistrationResult,
} from "@/features/registrations/api/registrationSchemas"

// Story and test data for the public side of a registration: the result of
// the form (S2-08) and the payment page opened from the QR link (F21-1).

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

export const QR_TOKEN = "qr-token-modra-hora"

// The open summer camp, as the public event fixture describes it.
const EVENT = {
  name: "Letní tábor Modrá Hora 2027",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko",
}
const TERMS = [
  { termId: uuid(101), label: "Turnus 1", startDate: "2027-07-04", endDate: "2027-07-17" },
  { termId: uuid(102), label: "Turnus 2", startDate: "2027-08-01", endDate: "2027-08-14" },
].map((term) => ({ ...term, priceMinor: 450_000 }))

/** The registration just sent: both terms wait for the organizer, nothing is owed yet. */
export function makeRegistrationResult(
  overrides: Partial<RegistrationResult> = {},
): RegistrationResult {
  return registrationResultSchema.parse({
    id: uuid(1),
    receivedAt: "2027-02-14T09:30:00.000Z",
    event: EVENT,
    firstName: "Tereza",
    lastName: "Nováková",
    email: "tereza.novakova@example.cz",
    phone: "+420777123456",
    terms: TERMS.map((term) => ({ ...term, status: "pending" })),
    selectedPriceMinor: 900_000,
    amountDueMinor: 0,
    paymentInstructions: null,
    paymentLinkToken: null,
    ...overrides,
  })
}

/** A confirmed term with the money due, so the result asks for payment with a QR. */
export const CONFIRMED_RESULT: RegistrationResult = makeRegistrationResult({
  terms: makeRegistrationResult().terms.map((term, index) => ({
    ...term,
    status: index === 0 ? "confirmed" : "waitlisted",
  })),
  amountDueMinor: 450_000,
  paymentInstructions: {
    amountMinor: 450_000,
    variableSymbol: "2027000001",
    account: { prefix: null, number: "2001234567", bankCode: "2010" },
    reminderAt: "2027-03-01",
  },
  paymentLinkToken: QR_TOKEN,
})

/** The payment page of a registration that still owes 2 500 Kč. */
export function makeQrPaymentPage(overrides: Partial<QrPaymentPage> = {}): QrPaymentPage {
  return qrPaymentPageSchema.parse({
    registrationId: uuid(1),
    eventName: EVENT.name,
    balanceMinor: 250_000,
    ...overrides,
  })
}
