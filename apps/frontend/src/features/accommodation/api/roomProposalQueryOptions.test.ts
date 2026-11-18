import { describe, expect, it } from "vitest"

import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"

describe("roomProposalKeys", () => {
  it("keeps the wishes under the term's proposal, so its reloads cover them (#317)", () => {
    const term = roomProposalKeys.term("org", "event", "term")
    const wishes = roomProposalKeys.wishes("org", "event", "term")

    expect(wishes.slice(0, term.length)).toEqual(term)
    // An apply and a mode change reload every key with "room-proposal" here.
    expect(wishes[3]).toBe("room-proposal")
  })
})
