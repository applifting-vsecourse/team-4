import { z } from "zod"

// Public content of an event with open registration (S2-06). No capacity,
// no payment settings, nothing of the organization.
export const publicEventSchema = z.object({
  name: z.string(),
  description: z.string(),
  location: z.string(),
  terms: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      priceMinor: z.number().int(),
    }),
  ),
})

export type PublicEvent = z.infer<typeof publicEventSchema>
