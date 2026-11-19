import { z } from "zod"

// The saved room placements of one term (F14-2, #20), as the backend (#337)
// answers them, and the board model the section works with.

/** A warning the organizer can confirm as an exception when placing someone. */
export const confirmableWarningSchema = z.enum(["mixed", "extra_bed", "over_capacity"])

/** What is wrong with a room; `room_unavailable` only for people already in it. */
export const roomWarningSchema = z.enum(["mixed", "extra_bed", "over_capacity", "room_unavailable"])

const placementPersonResponseSchema = z.object({
  registrationId: z.string().uuid(),
  name: z.string(),
  /** The effective value of the hard attribute; null without one or when rooms are not split. */
  value: z.string().nullable(),
})

const occupantResponseSchema = placementPersonResponseSchema.extend({
  /** A room proposal keeps a locked placement; it moves only once unlocked. */
  isLocked: z.boolean(),
  /** The warnings the organizer confirmed when placing them. */
  confirmedWarnings: z.array(confirmableWarningSchema),
})

const placementRoomResponseSchema = z.object({
  roomId: z.string().uuid(),
  label: z.string(),
  /** False also for a room without settings in the term. */
  isAvailable: z.boolean(),
  baseBeds: z.number().int().nonnegative(),
  extraBeds: z.number().int().nonnegative(),
  occupants: z.array(occupantResponseSchema),
  warnings: z.array(roomWarningSchema),
})

/** `GET …/accommodation/terms/:termId/placements`, also the answer to every change. */
export const termPlacementsResponseSchema = z.object({
  /** The attribute that splits rooms, e.g. `gender`; null when rooms are not split. */
  hardAttribute: z.string().nullable(),
  /** Every room of the event, by label. */
  rooms: z.array(placementRoomResponseSchema),
  /** Confirmed participants of the term without a room, by name. */
  unplaced: z.array(placementPersonResponseSchema),
})

/** The body of a 409 `placement_warnings`: the room's warnings after the placement. */
export const placementWarningsErrorSchema = z.object({
  code: z.literal("placement_warnings"),
  warnings: z.array(confirmableWarningSchema).min(1),
})

export type ConfirmableWarning = z.infer<typeof confirmableWarningSchema>
export type RoomWarning = z.infer<typeof roomWarningSchema>
export type TermPlacementsResponse = z.infer<typeof termPlacementsResponseSchema>

/** A room the board shows. */
export type PlacementRoom = {
  id: string
  label: string
  baseBeds: number
  extraBeds: number
  /** An unavailable room is shown only while someone is still in it, and takes nobody new. */
  isAvailable: boolean
  /** What the server finds wrong with the room now, also what changed after placing. */
  warnings: RoomWarning[]
  /** The warnings the organizer confirmed for someone in the room. */
  confirmedWarnings: ConfirmableWarning[]
}

/** A participant confirmed in the term, with or without a room. */
export type PlacementPerson = {
  registrationId: string
  name: string
  value: string | null
  roomId: string | null
  isLocked: boolean
}

export type TermPlacements = {
  hardAttribute: string | null
  rooms: PlacementRoom[]
  people: PlacementPerson[]
}

/**
 * The board model of the answer: the available rooms and any unavailable one
 * someone is still in, and every confirmed participant with their room.
 */
export function toTermPlacements(response: TermPlacementsResponse): TermPlacements {
  return {
    hardAttribute: response.hardAttribute,
    rooms: response.rooms
      .filter((room) => room.isAvailable || room.occupants.length > 0)
      .map(({ roomId, label, baseBeds, extraBeds, isAvailable, warnings, occupants }) => ({
        id: roomId,
        label,
        baseBeds,
        extraBeds,
        isAvailable,
        warnings,
        confirmedWarnings: [
          ...new Set(occupants.flatMap((occupant) => occupant.confirmedWarnings)),
        ],
      })),
    people: [
      ...response.rooms.flatMap((room) =>
        room.occupants.map(({ registrationId, name, value, isLocked }) => ({
          registrationId,
          name,
          value,
          roomId: room.roomId,
          isLocked,
        })),
      ),
      ...response.unplaced.map(({ registrationId, name, value }) => ({
        registrationId,
        name,
        value,
        roomId: null,
        isLocked: false,
      })),
    ],
  }
}

/** Parses the answer into the board model. */
export const termPlacementsSchema = termPlacementsResponseSchema.transform(toTermPlacements)
