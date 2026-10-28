import { roomsOverviewSchema, type RoomsOverview } from "@/features/rooms/api/roomSchemas"

// Preview data, parsed with the API schema so it can't drift from the
// contract. Term ids and capacities match the event fixtures.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const JULY = uuid(101)
const AUGUST = uuid(102)

export const ROOMS_OVERVIEW: RoomsOverview = roomsOverviewSchema.parse({
  rooms: [
    { id: uuid(401), label: "Chatka 1", bedCount: 6, termIds: [JULY, AUGUST] },
    { id: uuid(402), label: "Chatka 2", bedCount: 6, termIds: [JULY, AUGUST] },
    { id: uuid(403), label: "Chatka 3", bedCount: 6, termIds: [JULY, AUGUST] },
    { id: uuid(404), label: "Srub u lesa", bedCount: 6, termIds: [JULY] },
  ],
  terms: [
    {
      id: JULY,
      label: "Turnus 1",
      startDate: "2027-07-04",
      endDate: "2027-07-17",
      capacity: 24,
      confirmed: 4,
      free: 20,
      waitlisted: 0,
    },
    {
      id: AUGUST,
      label: "Turnus 2",
      startDate: "2027-08-01",
      endDate: "2027-08-14",
      capacity: 18,
      confirmed: 0,
      free: 18,
      waitlisted: 1,
    },
  ],
})
