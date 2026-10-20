import { z } from "zod"

import { paymentSettingsSchema } from "@/features/events/api/paymentSettingsSchemas"

export const eventStatusSchema = z.enum(["draft", "open", "closed"])

export const eventTermSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
  capacity: z.number().int(),
})

export const eventSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  location: z.string(),
  status: eventStatusSchema,
  termCount: z.number().int(),
  period: z.object({ startDate: z.string(), endDate: z.string() }).nullable(),
})

export const eventSummariesSchema = z.array(eventSummarySchema)

export const eventDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  location: z.string(),
  status: eventStatusSchema,
  isLocked: z.boolean(),
  terms: z.array(eventTermSchema),
  paymentSettings: paymentSettingsSchema.nullable(),
})

export type EventStatus = z.infer<typeof eventStatusSchema>
export type EventTerm = z.infer<typeof eventTermSchema>
export type EventSummary = z.infer<typeof eventSummarySchema>
export type EventDetail = z.infer<typeof eventDetailSchema>

export type EventInput = Pick<EventDetail, "name" | "description" | "location">
export type TermInput = Pick<EventTerm, "label" | "startDate" | "endDate" | "priceMinor">
