import { z } from "zod"

/** A room's settings in one term; the beds are kept while it is unavailable. */
export const roomTermSchema = z.object({
  termId: z.string().uuid(),
  isAvailable: z.boolean(),
  baseBeds: z.number().int(),
  extraBeds: z.number().int(),
})

export const roomSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  terms: z.array(roomTermSchema),
})

/** A term's capacity and how it is taken up (S2-05, S2-10, F11-1). */
export const termOccupancySchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  baseBeds: z.number().int(),
  extraBeds: z.number().int(),
  capacity: z.number().int(),
  confirmed: z.number().int(),
  free: z.number().int(),
  waitlisted: z.number().int(),
})

export const roomsOverviewSchema = z.object({
  rooms: z.array(roomSchema),
  terms: z.array(termOccupancySchema),
})

export type RoomTerm = z.infer<typeof roomTermSchema>
export type Room = z.infer<typeof roomSchema>
export type TermOccupancy = z.infer<typeof termOccupancySchema>
export type RoomsOverview = z.infer<typeof roomsOverviewSchema>

export type RoomInput = Pick<Room, "label" | "terms">
