import { z } from "zod"

// Account and due days applied to registrations received from now on (S2-09).
export const paymentSettingsSchema = z.object({
  bankAccountPrefix: z.string().nullable(),
  bankAccountNumber: z.string(),
  bankCode: z.string(),
  paymentDueDays: z.number().int(),
})

export type PaymentSettings = z.infer<typeof paymentSettingsSchema>
