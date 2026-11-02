import { z } from "zod"

// The public payment page opened from the QR link (F21-1). The token in the
// path is the only credential; nothing personal comes back.

export const qrPaymentPageSchema = z.object({
  eventName: z.string(),
  /** Remaining debt in haléře; zero or less means there is nothing to pay. */
  balanceMinor: z.number().int(),
})

export const qrPaymentResultSchema = z.object({
  paidMinor: z.number().int(),
  balanceMinor: z.number().int(),
})

export type QrPaymentPage = z.infer<typeof qrPaymentPageSchema>
export type QrPaymentResult = z.infer<typeof qrPaymentResultSchema>
