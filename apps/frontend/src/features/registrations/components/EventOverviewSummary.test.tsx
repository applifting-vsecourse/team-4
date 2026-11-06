import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EventOverviewSummary } from "@/features/registrations/components/EventOverviewSummary"
import {
  makeRegistrationList,
  makeRegistrationSummary,
  TERM_JULY,
} from "@/features/registrations/fixtures/registrations"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("@/lib/api-client", () => ({ api: { get } }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#x">{children}</a>,
}))

const TERMS = [{ id: TERM_JULY.termId, label: "Turnus 1", capacity: 10 }]

function renderSummary() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EventOverviewSummary
        organizationId="org"
        eventId="event"
        terms={TERMS}
      />
    </QueryClientProvider>,
  )
}

describe("EventOverviewSummary", () => {
  beforeEach(() => get.mockReset())

  it("shows a loading state, not zeros, while the data loads", () => {
    get.mockReturnValue({ json: () => new Promise(() => undefined) })
    renderSummary()
    expect(screen.getByLabelText("Načítání souhrnu")).toBeInTheDocument()
    expect(screen.queryByText("Přihlášky")).not.toBeInTheDocument()
  })

  it("offers a retry when loading fails, without showing zeros", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("down")) })
    renderSummary()
    expect(await screen.findByText("Souhrn se nepodařilo načíst.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
    expect(screen.queryByText("Přihlášky")).not.toBeInTheDocument()
  })

  it("sums registrations, occupancy and payments", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve(
          makeRegistrationList([
            makeRegistrationSummary({ paidMinor: 450_000, paymentState: "paid" }),
            makeRegistrationSummary({ id: "0190c0de-0000-7000-8000-000000000002" }),
          ]),
        ),
    })
    renderSummary()
    expect(await screen.findByText("2 / 10")).toBeInTheDocument()
    expect(screen.getByText("Přijato z 9 000 Kč k úhradě.")).toBeInTheDocument()
    expect(screen.getByText("2 z 10 lůžek")).toBeInTheDocument()
  })
})
