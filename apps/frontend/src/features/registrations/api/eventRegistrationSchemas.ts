import { z } from "zod"

import { participationStatusSchema } from "@/features/registrations/api/registrationSchemas"

// The organizer's view of an event's registrations (S2-11). Amounts are
// derived by the server (data-model.md §3.9); the client only shows them.

export const paymentStateSchema = z.enum(["none", "unpaid", "partial", "paid", "overpaid"])

export type PaymentState = z.infer<typeof paymentStateSchema>

const registrationTermSchema = z.object({
  termId: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
  status: participationStatusSchema,
})

export const registrationSummarySchema = z.object({
  id: z.string().uuid(),
  receivedAt: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  terms: z.array(registrationTermSchema),
  amountDueMinor: z.number().int(),
  paidMinor: z.number().int(),
  /** Positive a debt, zero settled, negative an overpayment. */
  balanceMinor: z.number().int(),
  paymentState: paymentStateSchema,
})

export const registrationListSchema = z.object({
  /** All registrations of the event, whatever the filters. */
  total: z.number().int(),
  registrations: z.array(registrationSummarySchema),
})

export const registrationDetailSchema = registrationSummarySchema.extend({
  selectedPriceMinor: z.number().int(),
  /** Payment reminder, not a deadline; null while nothing is due. */
  reminderAt: z.string().nullable(),
  variableSymbol: z.string().nullable(),
  payments: z.array(
    z.object({
      id: z.string().uuid(),
      receivedOn: z.string(),
      amountMinor: z.number().int(),
    }),
  ),
})

export type RegistrationSummary = z.infer<typeof registrationSummarySchema>
export type RegistrationList = z.infer<typeof registrationListSchema>
export type RegistrationDetail = z.infer<typeof registrationDetailSchema>

/** The list filters; they live in the URL, so a refresh keeps them. */
export const registrationFilterSchema = z.object({
  termId: z.string().uuid().optional().catch(undefined),
  status: participationStatusSchema.optional().catch(undefined),
  payment: paymentStateSchema.optional().catch(undefined),
})

export type RegistrationFilter = z.infer<typeof registrationFilterSchema>
