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
  it("omits the proposal section until a proposal exists", () => {
    render(<TermCapacitySummary term={WITHOUT_ROOMS} />)

    const untracked = screen.getByText("Ubytovací kapacita není evidovaná")

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Podle návrhu" })).not.toBeInTheDocument()
    expect(untracked).toBeInTheDocument()
  })
})
