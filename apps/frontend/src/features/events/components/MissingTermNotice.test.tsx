import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { MissingTermNotice } from "@/features/events/components/MissingTermNotice"

// Render the route destination so the target is covered without mounting the router.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    hash,
  }: {
    children: React.ReactNode
    to: string
    params: Record<string, string>
    hash?: string
  }) => {
    const path = to.replace(/\$(\w+)/g, (_, key: string) => params[key] ?? "")
    return <a href={`${path}${hash ? `#${hash}` : ""}`}>{children}</a>
  },
}))

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
  openingBlockers: [],
  isPublished: false,
}
const TERM: EventDetail["terms"][number] = {
  id: "term-a",
  label: "Turnus 1",
  startDate: "2026-07-01",
  endDate: "2026-07-07",
  priceMinor: 100000,
  capacity: 10,
}

const NOTICE = "Tato akce zatím nemá žádný termín."

describe("MissingTermNotice", () => {
  it("links an event without terms to its terms settings", () => {
    render(
      <MissingTermNotice
        organizationId={ORGANIZATION_ID}
        event={EVENT}
      />,
    )
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Přidat termín" })).toHaveAttribute(
      "href",
      "/organizations/org-a/events/event-a/settings#terms-heading",
    )
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
    expect(screen.queryByRole("link", { name: "Přidat termín" })).not.toBeInTheDocument()
  })
})
