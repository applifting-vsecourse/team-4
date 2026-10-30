import { roomsOverviewSchema, type RoomsOverview } from "@/features/rooms/api/roomSchemas"

// Preview data, parsed with the API schema so it can't drift from the
// contract. Term ids and capacities match the event fixtures.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const JULY = uuid(101)
const AUGUST = uuid(102)

const setting = (termId: string, baseBeds: number, extraBeds = 0, isAvailable = true) => ({
  termId,
  isAvailable,
  baseBeds,
  extraBeds,
})

export const ROOMS_OVERVIEW: RoomsOverview = roomsOverviewSchema.parse({
  rooms: [
    { id: uuid(401), label: "Chatka 1", terms: [setting(JULY, 6, 2), setting(AUGUST, 4)] },
    { id: uuid(402), label: "Chatka 2", terms: [setting(JULY, 6, 1), setting(AUGUST, 6, 1)] },
    { id: uuid(403), label: "Chatka 3", terms: [setting(JULY, 6), setting(AUGUST, 6)] },
    {
      id: uuid(404),
      label: "Srub u lesa",
      terms: [setting(JULY, 4), setting(AUGUST, 4, 0, false)],
    },
  ],
  terms: [
    {
      id: JULY,
      label: "Turnus 1",
      startDate: "2027-07-04",
      endDate: "2027-07-17",
      baseBeds: 22,
      extraBeds: 3,
      capacity: 25,
      confirmed: 4,
      free: 21,
      waitlisted: 0,
    },
    {
      id: AUGUST,
      label: "Turnus 2",
      startDate: "2027-08-01",
      endDate: "2027-08-14",
      baseBeds: 16,
      extraBeds: 1,
      capacity: 17,
      confirmed: 0,
      free: 17,
      waitlisted: 1,
    },
  ],
})
