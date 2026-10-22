import { z } from "zod"

export const participantSchema = z.object({ email: z.string() })
export type Participant = z.infer<typeof participantSchema>

export const magicLinkRequestedSchema = z.object({ message: z.string() })

export const magicLinkEmailSchema = z.object({
  email: z.string().trim().min(1, "Zadejte e-mail.").email("Zadejte e-mail ve správném tvaru."),
})
export type MagicLinkEmail = z.infer<typeof magicLinkEmailSchema>
