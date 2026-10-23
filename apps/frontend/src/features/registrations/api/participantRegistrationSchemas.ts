import { z } from "zod"

import {
  participationStatusSchema,
  paymentInstructionsSchema,
} from "@/features/registrations/api/registrationSchemas"

// The signed-in participant's own registrations (S2-14). Amounts are derived
// by the server; the client only shows them.

export const participantTermSchema = z.object({
  termId: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
  status: participationStatusSchema,
})

export const participantRegistrationSchema = z.object({
  id: z.string().uuid(),
  receivedAt: z.string(),
  event: z.object({ name: z.string(), location: z.string() }),
  terms: z.array(participantTermSchema),
  selectedPriceMinor: z.number().int(),
  amountDueMinor: z.number().int(),
  paidMinor: z.number().int(),
  /** Positive a debt, zero settled, negative an overpayment. */
  balanceMinor: z.number().int(),
  /** Only while a debt remains. */
  paymentInstructions: paymentInstructionsSchema.nullable(),
  payments: z.array(
    z.object({
      id: z.string().uuid(),
      receivedOn: z.string(),
      amountMinor: z.number().int(),
    }),
  ),
})

export const participantRegistrationListSchema = z.object({
  registrations: z.array(participantRegistrationSchema),
})

export type ParticipantTerm = z.infer<typeof participantTermSchema>
export type ParticipantRegistration = z.infer<typeof participantRegistrationSchema>
