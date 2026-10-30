import { describe, expect, it } from "vitest"

import { type RoomsOverview } from "@/features/rooms/api/roomSchemas"
import { toTermCapacities } from "@/features/rooms/lib/termCapacities"

const T1 = "0190c0de-0000-7000-8000-000000000011"
const T2 = "0190c0de-0000-7000-8000-000000000012"
const term = (id: string, label: string, baseBeds: number, extraBeds: number) => ({
  id,
  label,
  startDate: "2027-07-04",
  endDate: "2027-07-17",
  baseBeds,
  extraBeds,
  capacity: baseBeds + extraBeds,
  confirmed: 1,
  free: 0,
  waitlisted: 0,
})

const overview: RoomsOverview = {
  terms: [term(T1, "Turnus 1", 4, 1), term(T2, "Turnus 2", 0, 0)],
  rooms: [
    {
      id: "0190c0de-0000-7000-8000-000000000401",
      label: "Chatka 1",
      terms: [
        { termId: T1, isAvailable: true, baseBeds: 4, extraBeds: 1 },
        { termId: T2, isAvailable: false, baseBeds: 6, extraBeds: 2 },
      ],
    },
    { id: "0190c0de-0000-7000-8000-000000000402", label: "Půda", terms: [] },
  ],
}

describe("toTermCapacities", () => {
  const [first, second] = toTermCapacities(overview)

  it("takes the totals of a term from the server", () => {
    expect(first).toMatchObject({ beds: 4, extraBeds: 1, capacity: 5, confirmed: 1 })
    expect(second).toMatchObject({ beds: 0, extraBeds: 0, capacity: 0 })
  })

  it("gives each room its beds and their sum in every term", () => {
    expect(first?.rooms[0]).toMatchObject({ isAvailable: true, beds: 4, extraBeds: 1, total: 5 })
  })

  it("keeps the beds of a room that is unavailable in the term", () => {
    expect(second?.rooms[0]).toMatchObject({ isAvailable: false, beds: 6, extraBeds: 2 })
  })

  it("lists a room without settings as unavailable", () => {
    expect(first?.rooms[1]).toMatchObject({ label: "Půda", isAvailable: false, total: 0 })
  })
})
