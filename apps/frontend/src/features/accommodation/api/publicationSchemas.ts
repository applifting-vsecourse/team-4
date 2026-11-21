import { z } from "zod"

// Whether the room placements of a term are published to its participants
// (S4-02, #316), as the backend (#341) answers it.
export const roomPublicationSchema = z.object({
  isPublished: z.boolean(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
})

export type RoomPublication = z.infer<typeof roomPublicationSchema>
