import { describe, expect, it } from "vitest"

import {
  makeTermRoomProposal,
  makeTermWishes,
} from "@/features/accommodation/fixtures/roomProposal"
import {
  asApplied,
  hasApplyChanges,
  toApplyChanges,
  toProposalLayout,
  toWishRows,
  unplacedReasonText,
  wishStateBadge,
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

describe("asApplied", () => {
  it("leaves no difference against the saved rooms, and keeps the lock conflicts", () => {
    const layout = asApplied(layoutOf("withSaved"))
    const people = [...layout.rooms.flatMap((room) => room.people), ...layout.unplaced]

    expect(people.every((p) => p.change === null && p.savedRoom === undefined)).toBe(true)
    expect(layout.summary).toMatchObject({ added: 0, moved: 0, removed: 0, placed: 6 })
    expect(layout.unplaced).toMatchObject([{ name: "Tomáš Král", reason: "K" }])
    expect(layout.lockConflicts).toMatchObject([{ name: "Eliška Malá", room: "Chata Lípa" }])
    expect(hasApplyChanges(toApplyChanges(layout))).toBe(false)
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

describe("toWishRows", () => {
  it("pairs the saved state of each wish with its state in the proposal", () => {
    const proposal = makeTermRoomProposal("current").lastSolved!.layout!.wishes
    const rows = toWishRows(makeTermWishes("saved").wishes, proposal)

    expect(rows.map((row) => [row.from, row.to, row.saved, row.proposed])).toEqual([
      ["Tereza Nováková", "Anna Procházková", "satisfied", "satisfied"],
      ["Eliška Malá", "Lucie Sedláčková", "unsatisfied", "unsatisfied"],
      ["Tomáš Král", "Jan Dvořák", "unsatisfied", "unplaced"],
      ["Petr Svoboda", "Tereza Nováková", "impossible", "impossible"],
    ])
  })

  it("has no proposed state without a proposal or for a wish the proposal did not read", () => {
    const wishes = makeTermWishes("saved").wishes

    expect(toWishRows(wishes, undefined).every((row) => row.proposed === null)).toBe(true)
    expect(toWishRows(wishes, [])[0]!.proposed).toBeNull()
  })

  it("names the hard attribute when a wish cannot be met", () => {
    expect(wishStateBadge("impossible", "Pohlaví").label).toBe(
      "Nelze splnit: různá hodnota Pohlaví",
    )
    expect(wishStateBadge("unplaced").label).toBe("Čeká na umístění")
    expect(wishStateBadge("impossible", null).label).toBe(
      "Nelze splnit: různá hodnota tvrdého pravidla",
    )
  })
})
