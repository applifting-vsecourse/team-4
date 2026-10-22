import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { type TermOccupancy } from "@/features/rooms/api/roomSchemas"
import { OccupancySection } from "@/features/rooms/components/OccupancySection"

// The links need a router; the tests only look at their text.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>,
}))

const term = (
  label: string,
  counts: Pick<TermOccupancy, "capacity" | "confirmed" | "free" | "waitlisted">,
): TermOccupancy => ({
  id: `term-${label}`,
  label,
  startDate: "2027-07-01",
  endDate: "2027-07-07",
  ...counts,
})

const FULL = term("T1", { capacity: 2, confirmed: 2, free: 0, waitlisted: 1 })
const OPEN = term("T2", { capacity: 5, confirmed: 0, free: 5, waitlisted: 0 })
const NO_BEDS = term("T3", { capacity: 0, confirmed: 0, free: 0, waitlisted: 2 })

// 20. 10. 2026 14:03 in Prague.
const UPDATED_AT = Date.parse("2026-10-20T12:03:00Z")

function renderSection(
  terms: TermOccupancy[],
  state: { isRefreshing?: boolean; hasRefreshFailed?: boolean } = {},
) {
  const onRefresh = vi.fn()
  render(
    <OccupancySection
      organizationId="org"
      eventId="event"
      terms={terms}
      updatedAt={UPDATED_AT}
      isRefreshing={state.isRefreshing ?? false}
      hasRefreshFailed={state.hasRefreshFailed ?? false}
      onRefresh={onRefresh}
    />,
  )
  return { onRefresh }
}

/** Kapacita / Potvrzení / Volná lůžka / Náhradníci of the term's row. */
function countsOf(label: string): string[] {
  const row = screen.getAllByRole("row").find((r) => within(r).queryByText(label))!
  return within(row)
    .getAllByRole("cell")
    .slice(1)
    .map((cell) => cell.textContent ?? "")
}

describe("OccupancySection", () => {
  it("shows the four counts of every term with its dates", () => {
    renderSection([FULL, OPEN])

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Termín",
      "Kapacita",
      "Potvrzení",
      "Volná lůžka",
      "Náhradníci",
    ])
    expect(countsOf("T1")).toEqual(["2", "2", "0", "1"])
    expect(countsOf("T2")).toEqual(["5", "0", "5", "0"])
    expect(screen.getAllByText("1. 7. – 7. 7. 2027")).toHaveLength(2)
    expect(screen.getByText("Aktualizováno 20. 10. 2026 14:03")).toBeInTheDocument()
  })

  it("explains a term without beds and still shows its waiting participants", () => {
    renderSection([OPEN, NO_BEDS])
    expect(countsOf("T3")).toEqual(["0", "0", "0", "2"])
    expect(
      screen.getByText("T3 nemá dostupná lůžka. Náhradníci kapacitu nespotřebovávají."),
    ).toBeInTheDocument()
  })

  it("reloads the counts on Aktualizovat", async () => {
    const { onRefresh } = renderSection([FULL])
    await userEvent.click(screen.getByRole("button", { name: "Aktualizovat" }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("shows the progress of a reload", () => {
    renderSection([FULL], { isRefreshing: true })
    expect(screen.getByRole("button", { name: "Aktualizuji…" })).toBeDisabled()
    expect(screen.getByRole("region", { name: "Obsazenost po termínech" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("keeps the last counts after a failed reload, saying they are not fresh", async () => {
    const { onRefresh } = renderSection([FULL], { hasRefreshFailed: true })

    expect(screen.getByText("Aktualizace se nezdařila")).toBeInTheDocument()
    expect(
      screen.getByText("Zobrazené počty jsou z posledního úspěšného načtení (20. 10. 2026 14:03)."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Aktualizováno/)).not.toBeInTheDocument()
    expect(countsOf("T1")).toEqual(["2", "2", "0", "1"])

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("points to adding a term when the event has none", () => {
    renderSection([])
    expect(screen.getByText(/Akce zatím nemá žádné termíny/)).toBeInTheDocument()
    expect(screen.getByText("Přidat termín")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aktualizovat" })).not.toBeInTheDocument()
  })
})
