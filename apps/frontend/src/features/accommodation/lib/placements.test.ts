import { describe, expect, it } from "vitest"

import { termPlacementsSchema } from "@/features/accommodation/api/placementSchemas"
import {
  placementResponse,
  PLACEMENTS_STORE,
  TERM_NOT_SPLIT,
  TERM_PLACEMENTS,
  TERM_WITHOUT_PLACEMENTS,
  UNAVAILABLE_ROOM_STORE,
} from "@/features/accommodation/fixtures/placements"
import {
  describeWarnings,
  offersLock,
  placementWarnings,
  toPlacementBoard,
  warningText,
} from "@/features/accommodation/lib/placements"

const PLACEMENTS = termPlacementsSchema.parse(TERM_PLACEMENTS)
const NOT_SPLIT = termPlacementsSchema.parse(TERM_NOT_SPLIT)
const WITHOUT_PLACEMENTS = termPlacementsSchema.parse(TERM_WITHOUT_PLACEMENTS)

const room = (label: string) => PLACEMENTS.rooms.find((entry) => entry.label === label)!.id
const person = (name: string) =>
  PLACEMENTS.people.find((entry) => entry.name === name)!.registrationId

describe("termPlacementsSchema", () => {
  it("reads the backend's rooms and people into the board model", () => {
    const procházka = PLACEMENTS.people.find((entry) => entry.name === "Matěj Procházka")
    expect(procházka).toMatchObject({ roomId: null, isLocked: false, value: "male" })
    expect(PLACEMENTS.people.find((entry) => entry.name === "Petr Kučera")).toMatchObject({
      roomId: room("Srub u lesa"),
      isLocked: true,
    })
  })

  it("keeps an unavailable room only while someone is still in it", () => {
    const unavailable = termPlacementsSchema.parse(placementResponse(UNAVAILABLE_ROOM_STORE))
    expect(unavailable.rooms.find((entry) => entry.label === "Srub u lesa")).toMatchObject({
      isAvailable: false,
    })
    const emptied = termPlacementsSchema.parse(
      placementResponse({
        ...UNAVAILABLE_ROOM_STORE,
        people: PLACEMENTS_STORE.people.filter((entry) => !entry.name.startsWith("Petr K")),
      }),
    )
    expect(emptied.rooms.map((entry) => entry.label)).toContain("Srub u lesa")
    const nobody = termPlacementsSchema.parse(
      placementResponse({ ...UNAVAILABLE_ROOM_STORE, people: [] }),
    )
    expect(nobody.rooms.map((entry) => entry.label)).not.toContain("Srub u lesa")
  })
})

describe("toPlacementBoard", () => {
  it("puts each participant in the room or among those without one", () => {
    const board = toPlacementBoard(PLACEMENTS)
    const chatka1 = board.rooms.find((entry) => entry.label === "Chatka 1")!
    expect(chatka1.people.map((entry) => entry.name)).toEqual([
      "Anna Dvořáková",
      "Eliška Horáková",
      "Klára Svobodová",
      "Tereza Malá",
    ])
    expect(chatka1.free).toBe(1)
    expect(board.unplaced.map((entry) => entry.name)).toEqual(["Barbora Veselá", "Matěj Procházka"])
  })

  it("words the value of the hard attribute, and none when rooms are not split", () => {
    expect(toPlacementBoard(PLACEMENTS).people[0]?.value).toBe("Žena")
    expect(toPlacementBoard(NOT_SPLIT).people[0]?.value).toBeNull()
  })

  it("never counts free places below zero", () => {
    const crowded = {
      ...WITHOUT_PLACEMENTS,
      people: WITHOUT_PLACEMENTS.people.map((entry) => ({
        ...entry,
        roomId: room("Srub u lesa"),
      })),
    }
    expect(
      toPlacementBoard(crowded).rooms.find((entry) => entry.label === "Srub u lesa")?.free,
    ).toBe(0)
  })
})

describe("placementWarnings", () => {
  it("is empty for a room within its beds and of one value", () => {
    expect(placementWarnings(PLACEMENTS, person("Matěj Procházka"), room("Chatka 2"))).toEqual([])
  })

  it("warns of a mixed room and an extra bed, and offers the lock", () => {
    const warnings = placementWarnings(PLACEMENTS, person("Matěj Procházka"), room("Chatka 1"))
    expect(warnings.map(warningText)).toEqual([
      "Pokoj bude smíšený podle pravidla Pohlaví: Žena, Muž.",
      "Účastník obsadí přistýlku.",
    ])
    expect(offersLock(warnings)).toBe(true)
  })

  it("mixes nobody with someone without a value, as the backend does", () => {
    const withoutValue = {
      ...PLACEMENTS,
      people: PLACEMENTS.people.map((entry) =>
        entry.name === "Matěj Procházka" ? { ...entry, value: null } : entry,
      ),
    }
    expect(placementWarnings(withoutValue, person("Matěj Procházka"), room("Chatka 1"))).toEqual([
      { kind: "extra_bed" },
    ])
  })

  it("warns of the capacity without a lock when rooms are not split", () => {
    const warnings = placementWarnings(NOT_SPLIT, person("Barbora Veselá"), room("Srub u lesa"))
    expect(warnings).toEqual([{ kind: "over_capacity" }])
    expect(offersLock(warnings)).toBe(false)
  })

  it("is empty when the participant stays in the same room", () => {
    expect(placementWarnings(PLACEMENTS, person("Tereza Malá"), room("Chatka 1"))).toEqual([])
  })
})

describe("describeWarnings", () => {
  it("words the warnings the server found, also ones the board did not expect", () => {
    const warnings = describeWarnings(PLACEMENTS, person("Matěj Procházka"), room("Chatka 2"), [
      "over_capacity",
    ])
    expect(warnings).toEqual([{ kind: "over_capacity" }])
    const mixed = describeWarnings(PLACEMENTS, person("Matěj Procházka"), room("Chatka 2"), [
      "mixed",
    ])
    expect(mixed.map(warningText)).toEqual(["Pokoj bude smíšený podle pravidla Pohlaví."])
  })

  it("keeps the board's wording where it agrees with the server", () => {
    expect(
      describeWarnings(PLACEMENTS, person("Matěj Procházka"), room("Chatka 1"), ["mixed"]).map(
        warningText,
      ),
    ).toEqual(["Pokoj bude smíšený podle pravidla Pohlaví: Žena, Muž."])
  })
})
