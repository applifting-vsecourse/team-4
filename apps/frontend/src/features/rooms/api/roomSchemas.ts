import { z } from "zod"

export const roomSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  bedCount: z.number().int(),
  termIds: z.array(z.string().uuid()),
})

/** A term's capacity and how it is taken up (S2-05, S2-10). */
export const termOccupancySchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  capacity: z.number().int(),
  confirmed: z.number().int(),
  free: z.number().int(),
  waitlisted: z.number().int(),
})

export const roomsOverviewSchema = z.object({
  rooms: z.array(roomSchema),
  terms: z.array(termOccupancySchema),
})

export type Room = z.infer<typeof roomSchema>
export type TermOccupancy = z.infer<typeof termOccupancySchema>
export type RoomsOverview = z.infer<typeof roomsOverviewSchema>

export type RoomInput = Pick<Room, "label" | "bedCount" | "termIds">
