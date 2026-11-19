import { describe, expect, it } from "vitest"

import {
  TERM_NOT_SPLIT,
  TERM_PLACEMENTS,
  TERM_WITHOUT_PLACEMENTS,
} from "@/features/accommodation/fixtures/placements"
import {
  offersLock,
  placementWarnings,
  toPlacementBoard,
  warningText,
} from "@/features/accommodation/lib/placements"

const room = (label: string) => TERM_PLACEMENTS.rooms.find((entry) => entry.label === label)!.id
const person = (lastName: string) =>
  TERM_PLACEMENTS.people.find((entry) => entry.lastName === lastName)!.registrationId

describe("toPlacementBoard", () => {
  it("puts each participant in the room or among those without one", () => {
    const board = toPlacementBoard(TERM_PLACEMENTS)
    const chatka1 = board.rooms.find((entry) => entry.label === "Chatka 1")!
    expect(chatka1.people.map((entry) => entry.name)).toEqual([
      "Anna Dvořáková",
      "Eliška Horáková",
      "Tereza Malá",
      "Klára Svobodová",
    ])
    expect(chatka1.free).toBe(1)
    expect(board.unplaced.map((entry) => entry.name)).toEqual(["Matěj Procházka", "Barbora Veselá"])
  })

  it("words the value of the hard attribute, and none when rooms are not split", () => {
    expect(toPlacementBoard(TERM_PLACEMENTS).people[0]?.value).toBe("Muž")
    expect(toPlacementBoard(TERM_NOT_SPLIT).people[0]?.value).toBeNull()
  })

  it("never counts free places below zero", () => {
    const crowded = {
      ...TERM_WITHOUT_PLACEMENTS,
      people: TERM_WITHOUT_PLACEMENTS.people.map((entry) => ({
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
    expect(placementWarnings(TERM_PLACEMENTS, person("Procházka"), room("Chatka 2"))).toEqual([])
  })

  it("warns of a mixed room and an extra bed, and offers the lock", () => {
    const warnings = placementWarnings(TERM_PLACEMENTS, person("Procházka"), room("Chatka 1"))
    expect(warnings.map(warningText)).toEqual([
      "Pokoj bude smíšený podle pravidla Pohlaví: Žena, Muž.",
      "Účastník obsadí přistýlku.",
    ])
    expect(offersLock(warnings)).toBe(true)
  })

  it("warns of the capacity without a lock when rooms are not split", () => {
    const warnings = placementWarnings(TERM_NOT_SPLIT, person("Veselá"), room("Srub u lesa"))
    expect(warnings).toEqual([{ kind: "overCapacity" }])
    expect(offersLock(warnings)).toBe(false)
  })

  it("is empty when the participant stays in the same room", () => {
    expect(placementWarnings(TERM_PLACEMENTS, person("Malá"), room("Chatka 1"))).toEqual([])
  })
})
