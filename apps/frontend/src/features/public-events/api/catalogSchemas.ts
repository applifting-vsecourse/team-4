import { z } from "zod"

// Public catalog of published events (F54-2, #64). Proposed contract for the
// mock UI; the endpoint does not exist yet.

export const catalogAvailabilitySchema = z.enum(["available", "few", "full"])

export type CatalogAvailability = z.infer<typeof catalogAvailabilitySchema>

export const catalogEventSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  organizationName: z.string(),
  /** Town or venue shown on the card. */
  location: z.string(),
  /** Region (kraj) used by the place filter. */
  region: z.string(),
  ageMin: z.number().int(),
  /** Null when there is no upper age limit. */
  ageMax: z.number().int().nullable(),
  priceFromMinor: z.number().int(),
  availability: catalogAvailabilitySchema,
  terms: z.array(z.object({ startDate: z.string(), endDate: z.string() })).min(1),
})

export type CatalogEvent = z.infer<typeof catalogEventSchema>

export const catalogSchema = z.array(catalogEventSchema)
