import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TermCapacitySummary } from "@/features/accommodation/components/TermCapacitySummary"

const WITHOUT_ROOMS = {
  confirmed: 0,
  pending: 0,
  waitlisted: 0,
  hasRooms: false,
  baseBeds: 0,
  extraBeds: 0,
}

describe("TermCapacitySummary", () => {
  it("shows untracked capacity as the same plain text as a missing proposal", () => {
    render(<TermCapacitySummary term={WITHOUT_ROOMS} />)

    const untracked = screen.getByText("Ubytovací kapacita není evidovaná")
    const noProposal = screen.getByText("Bez platného návrhu")

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(untracked.tagName).toBe(noProposal.tagName)
    expect(untracked.className).toBe(noProposal.className)
  })
})
