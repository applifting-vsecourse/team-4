import { z } from "zod"

const publicTermSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
})

// Public content of an event with open registration (S2-06). No capacity,
// no payment settings, nothing of the organization.
export const publicEventSchema = z.object({
  name: z.string(),
  description: z.string(),
  location: z.string(),
  terms: z.array(publicTermSchema),
  // Listed in the catalog, so the form can link to the public detail.
  isPublished: z.boolean(),
  // Participation terms (F07), possibly with cancellation information; empty
  // means there is nothing to read and confirm.
  conditions: z.string(),
  // The organizer's categorical questions of the form (#485), in form order.
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      isRequired: z.boolean(),
      options: z.array(z.object({ id: z.string().uuid(), label: z.string() })),
    }),
  ),
  // The version of the questions shown; sent back with the registration.
  questionsVersion: z.string(),
  // Rooms are split by gender: the form requires an answer ("Nechci uvést" counts).
  isGenderRequired: z.boolean(),
})

export type PublicEvent = z.infer<typeof publicEventSchema>

const registrationStatusSchema = z.enum(["open", "not-open", "closed"])

// Catalog detail of a published event (F55): whatever the registration status,
// still without capacity, registrations or internal data.
export const catalogEventSchema = z.object({
  name: z.string(),
  organizationName: z.string(),
  description: z.string(),
  location: z.string(),
  conditions: z.string(),
  contact: z
    .object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  photos: z.array(z.object({ id: z.string().uuid() })),
  registrationStatus: registrationStatusSchema,
  terms: z.array(publicTermSchema),
})

export type CatalogEvent = z.infer<typeof catalogEventSchema>

// One published event in the public catalog list (F54-2a): enough for a card,
// nothing of capacity, registrations or the organization's account.
export const catalogItemSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  organizationName: z.string(),
  location: z.string(),
  coverPhotoId: z.string().uuid().nullable(),
  registrationStatus: registrationStatusSchema,
  terms: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }),
  ),
})

export const catalogListSchema = z.array(catalogItemSchema)

export type CatalogItem = z.infer<typeof catalogItemSchema>

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Search and filters of the catalog (F54-2b), kept in the URL so a refresh,
// a retry and the way back keep them. An invalid value is dropped, not an error;
// so is an end before the start, which the date pickers do not offer.
export const catalogFilterSchema = z
  .object({
    q: z.string().max(120).optional().catch(undefined),
    from: calendarDateSchema.optional().catch(undefined),
    to: calendarDateSchema.optional().catch(undefined),
    place: z.string().max(120).optional().catch(undefined),
    open: z.boolean().optional().catch(undefined),
  })
  .transform((filter) =>
    filter.from && filter.to && filter.to < filter.from ? { ...filter, to: undefined } : filter,
  )

export type CatalogFilter = z.output<typeof catalogFilterSchema>
