import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render as renderUi, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { MissingTermNotice } from "@/features/events/components/MissingTermNotice"

function render(ui: React.ReactElement) {
  return renderUi(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
}

const ORGANIZATION_ID = "org-a"
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
  it("opens the new term dialog from an event without terms", async () => {
    render(
      <MissingTermNotice
        organizationId={ORGANIZATION_ID}
        event={EVENT}
      />,
    )
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Přidat termín" }))
    expect(screen.getByRole("dialog", { name: "Nový termín" })).toBeInTheDocument()
  })

  it("shows nothing once the event has a term", () => {
    const { container } = render(
      <MissingTermNotice
        organizationId={ORGANIZATION_ID}
        event={{ ...EVENT, terms: [TERM] }}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("explains the lock instead of offering to add a term", () => {
    render(
      <MissingTermNotice
        organizationId={ORGANIZATION_ID}
        event={{ ...EVENT, status: "closed", isLocked: true }}
      />,
    )
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    expect(screen.getByText(/jsou termíny zamčené/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přidat termín" })).not.toBeInTheDocument()
  })
})
