import { z } from "zod"

import { paymentSettingsSchema } from "@/features/events/api/paymentSettingsSchemas"

// What is still missing before registration can be opened (S2-06).
export const openingBlockerSchema = z.enum([
  "name",
  "description",
  "location",
  "terms",
  "paymentSettings",
])

export const eventStatusSchema = z.enum(["draft", "open", "closed"])

export const eventTermSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
  capacity: z.number().int(),
  /** Items in the term's programme (F65). */
  programmeItemCount: z.number().int(),
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

// Public contact on the catalog detail (F55); never the account's own contact.
export const publicContactSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
})

export const eventDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  location: z.string(),
  status: eventStatusSchema,
  isLocked: z.boolean(),
  terms: z.array(eventTermSchema),
  paymentSettings: paymentSettingsSchema.nullable(),
  changeApprovalDays: z.number().int().nullable(),
  publicId: z.string(),
  isPublished: z.boolean(),
  conditions: z.string(),
  contact: publicContactSchema.nullable(),
  photos: z.array(z.object({ id: z.string().uuid() })),
  openingBlockers: z.array(openingBlockerSchema),
})

export type OpeningBlocker = z.infer<typeof openingBlockerSchema>
export type EventStatus = z.infer<typeof eventStatusSchema>
export type EventTerm = z.infer<typeof eventTermSchema>
export type EventSummary = z.infer<typeof eventSummarySchema>
export type EventDetail = z.infer<typeof eventDetailSchema>
export type PublicContact = z.infer<typeof publicContactSchema>

/** Body of PUT …/presentation; empty contact fields remove the public contact. */
export type PresentationInput = {
  description: string
  conditions: string
  contactName: string
  contactEmail: string
  contactPhone: string
}

export type EventInput = Pick<EventDetail, "name" | "description" | "location">
export type TermInput = Pick<EventTerm, "label" | "startDate" | "endDate" | "priceMinor">
