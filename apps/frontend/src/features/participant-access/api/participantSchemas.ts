import { z } from "zod"

export const participantSchema = z.object({ email: z.string() })
export type Participant = z.infer<typeof participantSchema>

export const magicLinkRequestedSchema = z.object({ message: z.string() })

export const magicLinkEmailSchema = z.object({
  email: z.string().trim().min(1, "Zadejte e-mail.").email("Zadejte e-mail ve správném tvaru."),
})
export type MagicLinkEmail = z.infer<typeof magicLinkEmailSchema>

/** The optional profile of the signed-in account (S4-08); `null` is not filled in. */
export const participantProfileSchema = z.object({
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  /** E.164. */
  phone: z.string().nullable(),
})
export type ParticipantProfile = z.infer<typeof participantProfileSchema>

/** What the profile form saves; an empty value clears the field. */
export type ParticipantProfileInput = Pick<ParticipantProfile, "firstName" | "lastName" | "phone">
