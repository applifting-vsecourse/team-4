import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render as renderUi, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { MissingTermNotice } from "@/features/events/components/MissingTermNotice"

function render(ui: React.ReactElement) {
  return renderUi(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
}

const EVENT: EventDetail = {
  id: "event-a",
  name: "Tábor",
  description: "Popis",
  location: "Podlesí",
  status: "draft",
  isLocked: false,
  terms: [],
  paymentSettings: null,
  publicId: "abcdefghijkl",
  isPublished: false,
  changeApprovalDays: null,
  conditions: "",
  contact: null,
  photos: [],
  openingBlockers: [],
}
const TERM: EventDetail["terms"][number] = {
  id: "term-a",
  label: "Turnus 1",
  startDate: "2026-07-01",
  endDate: "2026-07-07",
  priceMinor: 100000,
  capacity: 10,
  programmeItemCount: 0,
}

const NOTICE = "Tato akce zatím nemá žádný termín."

describe("MissingTermNotice", () => {
  it("shows nothing once the event has a term", () => {
    const { container } = render(<MissingTermNotice event={{ ...EVENT, terms: [TERM] }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("leaves the missing-term action to the checklist while the event is editable", () => {
    const { container } = render(<MissingTermNotice event={EVENT} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it("explains the lock instead of offering to add a term", () => {
    render(<MissingTermNotice event={{ ...EVENT, status: "closed", isLocked: true }} />)
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    expect(screen.getByText(/jsou termíny zamčené/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přidat termín" })).not.toBeInTheDocument()
  })
})
