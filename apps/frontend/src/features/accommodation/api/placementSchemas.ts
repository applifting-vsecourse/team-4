import { z } from "zod"

// The saved room placements of one term (F14-2, #20). The contract is
// proposed here for the backend (#337), which is not built yet.

/** A room available in the term, with its beds there. */
export const placementRoomSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  baseBeds: z.number().int().nonnegative(),
  extraBeds: z.number().int().nonnegative(),
})

/** A participant confirmed in the term, with or without a room. */
export const placementPersonSchema = z.object({
  registrationId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  /** The effective value of the hard attribute; null without an answer or when rooms are not split. */
  value: z.string().nullable(),
  roomId: z.string().uuid().nullable(),
  /** A room proposal never changes a locked placement. */
  isLocked: z.boolean(),
})

export const termPlacementsSchema = z.object({
  termId: z.string().uuid(),
  /** The attribute that splits rooms, e.g. `gender`; null when rooms are not split. */
  hardAttribute: z.string().nullable(),
  rooms: z.array(placementRoomSchema),
  people: z.array(placementPersonSchema),
})

export type PlacementRoom = z.infer<typeof placementRoomSchema>
export type PlacementPerson = z.infer<typeof placementPersonSchema>
export type TermPlacements = z.infer<typeof termPlacementsSchema>

/** What one save stores for one participant; `roomId: null` removes the placement. */
export type PlacementInput = { roomId: string | null; isLocked: boolean }
