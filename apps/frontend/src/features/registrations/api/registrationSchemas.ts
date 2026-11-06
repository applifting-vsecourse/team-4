import { z } from "zod"

/** What the organizer filters by; a released term is no participation. */
export const activeParticipationStatusSchema = z.enum(["pending", "confirmed", "waitlisted"])

/**
 * A term of a registration: "pending" waits for the organizer's decision
 * (S3-01), "cancelled" is a term the participant released (F35-2a).
 */
export const participationStatusSchema = z.enum(["pending", "confirmed", "waitlisted", "cancelled"])

export type ParticipationStatus = z.infer<typeof participationStatusSchema>

/** The voluntary answer for accommodation (F64); null elsewhere is "not answered". */
export const genderSchema = z.enum(["female", "male", "other", "undisclosed"])

export type Gender = z.infer<typeof genderSchema>

/** The participant's own words for "Jiná odpověď"; null when there are none. */
export const genderOtherSchema = z.string().max(100).nullable()

/** The whole answer: `genderOther` is only ever set beside `other`. */
export type GenderAnswer = { gender: Gender | null; genderOther: string | null }

export const bankAccountSchema = z.object({
  prefix: z.string().nullable(),
  number: z.string(),
  bankCode: z.string(),
})

export const paymentInstructionsSchema = z.object({
  /** What is still owed, in haléře. */
  amountMinor: z.number().int(),
  variableSymbol: z.string(),
  account: bankAccountSchema,
  /** Payment reminder date, not a deadline. */
  reminderAt: z.string(),
})

/** Entered by the organizer, or paid through the QR link (F21-1). */
export const paymentSourceSchema = z.enum(["organizer", "qr_link"])

export const receivedPaymentSchema = z.object({
  id: z.string().uuid(),
  receivedOn: z.string(),
  amountMinor: z.number().int(),
  source: paymentSourceSchema,
})

export type ReceivedPayment = z.infer<typeof receivedPaymentSchema>

export type PaymentInstructions = z.infer<typeof paymentInstructionsSchema>

export const transportChoiceSchema = z.enum(["own", "shared"])
export const dietChoiceSchema = z.enum(["vegetarian", "vegan", "gluten_free", "lactose_free"])

export type TransportChoice = z.infer<typeof transportChoiceSchema>
export type DietChoice = z.infer<typeof dietChoiceSchema>

/**
 * Transport, diet and health (F63), once for the whole registration. Empty
 * text and no choice mean "not provided", never an explicit "Bez omezení".
 */
export const registrationNeedsSchema = z.object({
  transport: transportChoiceSchema.nullable(),
  transportNote: z.string(),
  /** Explicit "Bez omezení"; never together with a diet choice. */
  hasNoDietRestriction: z.boolean(),
  diet: z.array(dietChoiceSchema),
  dietNote: z.string(),
  health: z.string(),
})

export type RegistrationNeeds = z.infer<typeof registrationNeedsSchema>

export const NO_NEEDS: RegistrationNeeds = {
  transport: null,
  transportNote: "",
  hasNoDietRestriction: false,
  diet: [],
  dietNote: "",
  health: "",
}

// The stored outcome of the registration just submitted (S2-08). Nothing of
// other registrations, and no capacity.
export const registrationResultSchema = z.object({
  id: z.string().uuid(),
  receivedAt: z.string(),
  event: z.object({ name: z.string(), location: z.string() }),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  terms: z.array(
    z.object({
      termId: z.string().uuid(),
      label: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      priceMinor: z.number().int(),
      status: participationStatusSchema,
    }),
  ),
  /** Sum of the selected terms, unconfirmed ones included; not the amount due. */
  selectedPriceMinor: z.number().int(),
  /** Σ confirmed terms; 0 while none is confirmed or for free terms. */
  amountDueMinor: z.number().int(),
  /** Null at zero obligation: no reminder date and no request to pay. */
  paymentInstructions: paymentInstructionsSchema.nullable(),
  /** Token of the QR payment link; null while nothing is owed. */
  paymentLinkToken: z.string().nullable(),
})

export type RegistrationResult = z.infer<typeof registrationResultSchema>

/** A term offered in the form, as the public event lists it (S2-06). */
export type SelectableTerm = {
  id: string
  label: string
  startDate: string
  endDate: string
  priceMinor: number
}

export type RegistrationInput = {
  /** The same for every retry of one filled-in form. */
  submissionKey: string
  firstName: string
  lastName: string
  email: string
  phone: string
  termIds: string[]
  needs: RegistrationNeeds
  /** Voluntary; null is "not answered". */
  gender: Gender | null
  /** Own words for `other` only; null when none. */
  genderOther: string | null
}
