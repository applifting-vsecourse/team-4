import { describe, expect, it } from "vitest"

import { makeTermRoomProposal } from "@/features/accommodation/fixtures/roomProposal"
import {
  hasApplyChanges,
  toApplyChanges,
  toProposalLayout,
  unplacedReasonText,
} from "@/features/accommodation/lib/roomProposalView"

const layoutOf = (preset: Parameters<typeof makeTermRoomProposal>[0]) =>
  toProposalLayout(makeTermRoomProposal(preset).lastSolved!.layout!)

describe("toProposalLayout", () => {
  it("lists the available rooms in room order with their people", () => {
    const layout = layoutOf("current")

    expect(layout.rooms.map((room) => [room.label, room.people.map((p) => p.name)])).toEqual([
      ["Chata Buk", ["Jan Dvořák", "Petr Svoboda", "Ondřej Černý"]],
      ["Chata Dub", ["Eliška Malá"]],
      ["Chata Javor", ["Tereza Nováková", "Anna Procházková", "Lucie Sedláčková"]],
    ])
    expect(layout.unplaced).toMatchObject([{ name: "Tomáš Král", reason: "H" }])
    expect(layout.isEmpty).toBe(false)
  })

  it("names the saved room of a move, a lost room and a lock conflict", () => {
    const layout = layoutOf("withSaved")
    const people = layout.rooms.flatMap((room) => room.people)

    expect(people.find((p) => p.name === "Jan Dvořák")).toMatchObject({
      change: "moved",
      savedRoom: "Chata Dub",
    })
    // An unchanged placement carries no change.
    expect(people.find((p) => p.name === "Tereza Nováková")).toMatchObject({
      change: null,
      isLocked: true,
      savedRoom: undefined,
    })
    expect(layout.unplaced).toMatchObject([
      { name: "Tomáš Král", reason: "K", change: "removed", savedRoom: "Chata Buk" },
    ])
    expect(layout.lockConflicts).toMatchObject([{ name: "Eliška Malá", room: "Chata Lípa" }])
    // A lock conflict is in no room.
    expect(people.map((p) => p.name)).not.toContain("Eliška Malá")
  })

  it("words the reason H with the hard attribute when it is known", () => {
    expect(unplacedReasonText("H", "Pohlaví")).toBe(
      "Volné lůžko je jen v pokoji s jinou hodnotou „Pohlaví“ nebo v pokoji uzavřeném zámkem.",
    )
  })

  it("marks a proposal without confirmed people as empty", () => {
    expect(layoutOf("empty").isEmpty).toBe(true)
  })
})

describe("toApplyChanges", () => {
  it("lists new placements, moves and lost rooms; locked and unchanged people stay out", () => {
    const changes = toApplyChanges(layoutOf("withSaved"))

    // Each change also carries the person's id, the key of its row.
    expect(changes).toMatchObject({
      added: [
        { name: "Petr Svoboda", room: "Chata Buk" },
        { name: "Ondřej Černý", room: "Chata Buk" },
      ],
      moved: [{ name: "Jan Dvořák", from: "Chata Dub", to: "Chata Buk" }],
      removed: [{ name: "Tomáš Král", from: "Chata Buk" }],
    })
    expect(hasApplyChanges(changes)).toBe(true)
  })

  it("has nothing to apply without confirmed people", () => {
    expect(hasApplyChanges(toApplyChanges(layoutOf("empty")))).toBe(false)
  })
})
