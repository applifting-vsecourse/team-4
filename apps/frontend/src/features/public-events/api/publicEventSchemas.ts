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
})

export type PublicEvent = z.infer<typeof publicEventSchema>

// Catalog detail of a published event (F55): whatever the registration status,
// still without capacity, registrations or internal data.
export const catalogEventSchema = z.object({
  name: z.string(),
  organizationName: z.string(),
  description: z.string(),
  location: z.string(),
  conditions: z.string(),
  contact: z
    .object({ name: z.string(), email: z.string(), phone: z.string().nullable() })
    .nullable(),
  photos: z.array(z.object({ id: z.string().uuid() })),
  registrationStatus: z.enum(["open", "not-open", "closed"]),
  terms: z.array(publicTermSchema),
})

export type CatalogEvent = z.infer<typeof catalogEventSchema>
