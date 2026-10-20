import { z } from "zod"

export const roomSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  bedCount: z.number().int(),
  termIds: z.array(z.string().uuid()),
})

export const termCapacitySchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  capacity: z.number().int(),
  confirmed: z.number().int(),
})

export const roomsOverviewSchema = z.object({
  rooms: z.array(roomSchema),
  terms: z.array(termCapacitySchema),
})

export type Room = z.infer<typeof roomSchema>
export type TermCapacity = z.infer<typeof termCapacitySchema>
export type RoomsOverview = z.infer<typeof roomsOverviewSchema>

export type RoomInput = Pick<Room, "label" | "bedCount" | "termIds">
