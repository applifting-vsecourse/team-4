import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { type RoomsOverview } from "@/features/rooms/api/roomSchemas"
import { RoomsSection } from "@/features/rooms/components/RoomsSection"

vi.mock("@/lib/api-client", () => ({
  api: {},
  HTTPError: class HTTPError extends Error {},
}))

const T1 = "0190c0de-0000-7000-8000-000000000011"
const T2 = "0190c0de-0000-7000-8000-000000000012"

const terms = [
  {
    id: T1,
    label: "T1",
    startDate: "2027-07-01",
    endDate: "2027-07-07",
    capacity: 5,
    confirmed: 3,
    free: 2,
    waitlisted: 0,
  },
  {
    id: T2,
    label: "T2",
    startDate: "2027-07-15",
    endDate: "2027-07-21",
    capacity: 3,
    confirmed: 0,
    free: 3,
    waitlisted: 0,
  },
]

function renderSection(overview: RoomsOverview) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomsSection
        organizationId="org"
        eventId="event"
        overview={overview}
        onChanged={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe("RoomsSection", () => {
  it("lists every room with its beds and availability", () => {
    renderSection({
      terms,
      rooms: [
        { id: "a", label: "Pokoj 1", bedCount: 2, termIds: [T1] },
        { id: "b", label: "Pokoj 2", bedCount: 3, termIds: [T1, T2] },
        { id: "c", label: "Půda", bedCount: 1, termIds: [] },
      ],
    })

    const rows = screen.getAllByRole("row")
    const room = (label: string): HTMLElement => rows.find((row) => within(row).queryByText(label))!
    expect(within(room("Pokoj 1")).getByText("2")).toBeInTheDocument()
    expect(within(room("Pokoj 2")).getByText("T2")).toBeInTheDocument()
    expect(within(room("Půda")).getByText("Není dostupný v žádném termínu")).toBeInTheDocument()
    expect(
      within(room("Pokoj 1")).getByRole("button", { name: "Upravit pokoj Pokoj 1" }),
    ).toHaveTextContent("Upravit")
  })

  it("shows an empty state with the add action", () => {
    renderSection({ terms, rooms: [] })
    expect(screen.getByText("Zatím žádné pokoje")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Přidat pokoj" })).toBeInTheDocument()
  })

  it("lets a room be added in an event without terms", () => {
    renderSection({ terms: [], rooms: [] })
    expect(screen.getByRole("button", { name: "Přidat pokoj" })).toBeInTheDocument()
  })
})
