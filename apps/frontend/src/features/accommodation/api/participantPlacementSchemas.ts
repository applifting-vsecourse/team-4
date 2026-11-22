import { z } from "zod"

// The own room and roommate wishes of each confirmed term of a registration
// (S4-02, #316), as the backend (#341) answers the participant. A term whose
// rooms are not published carries neither.

export const participantWishStateSchema = z.enum(["satisfied", "unsatisfied", "unplaced"])

const termSchema = z.object({
  termId: z.string().uuid(),
  label: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date(),
})

const publishedTermSchema = termSchema.extend({
  isPublished: z.literal(true),
  room: z.object({ label: z.string() }).nullable(),
  wishes: z.array(
    z.object({
      registrationId: z.string().uuid(),
      name: z.string(),
      state: participantWishStateSchema,
    }),
  ),
})

export const participantTermPlacementSchema = z.discriminatedUnion("isPublished", [
  termSchema.extend({ isPublished: z.literal(false) }),
  publishedTermSchema,
])

export const participantRoomPlacementsSchema = z.object({
  terms: z.array(participantTermPlacementSchema),
})

export type ParticipantTermPlacement = z.infer<typeof participantTermPlacementSchema>
export type ParticipantRoomPlacements = z.infer<typeof participantRoomPlacementsSchema>
