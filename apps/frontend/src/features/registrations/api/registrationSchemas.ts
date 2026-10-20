import { z } from "zod"

export const participationStatusSchema = z.enum(["confirmed", "waitlisted"])

export type ParticipationStatus = z.infer<typeof participationStatusSchema>

// The stored outcome of the registration just submitted (S2-08). Nothing of
// other registrations, and no capacity.
export const registrationResultSchema = z.object({
  id: z.string().uuid(),
  receivedAt: z.string(),
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
  /** Sum of the selected terms, waitlisted ones included; not the amount due. */
  selectedPriceMinor: z.number().int(),
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
}
