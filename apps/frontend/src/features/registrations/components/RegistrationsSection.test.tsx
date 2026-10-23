import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  type RegistrationFilter,
  type RegistrationList,
  type RegistrationSummary,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { RegistrationsSection } from "@/features/registrations/components/RegistrationsSection"

// Each GET answers with the next queued response (a list, a failure, or one
// that never arrives); the search params are kept to check that a refresh asks
// with the same filters.
const responses: (RegistrationList | Error | "never")[] = []
const requests: Record<string, string>[] = []
vi.mock("@/lib/api-client", () => ({
  api: {
    get: (_path: string, options: { searchParams: Record<string, string> }) => {
      requests.push(options.searchParams)
      const next = responses.shift() ?? new Error("no response queued")
      return {
        json: () => {
          if (next === "never") return new Promise(() => undefined)
          return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
        },
      }
    },
  },
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#detail">{children}</a>,
}))

// jsdom lacks what the Radix select uses for pointer and scrolling.
beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
})

beforeEach(() => {
  responses.length = 0
  requests.length = 0
})

const T1 = "0190c0de-0000-7000-8000-000000000001"
const T2 = "0190c0de-0000-7000-8000-000000000002"
const TERMS = [
  { id: T1, label: "1. turnus" },
  { id: T2, label: "2. turnus" },
]

const registration = (overrides: Partial<RegistrationSummary> = {}): RegistrationSummary => ({
  id: "0190c0de-0000-7000-8000-0000000000a1",
  receivedAt: "2026-10-10T07:31:05.000Z",
  firstName: "Eliška",
  lastName: "Svobodová",
  email: "eliska@example.test",
  phone: "+420601234567",
  terms: [
    {
      termId: T1,
      label: "1. turnus",
      startDate: "2027-07-01",
      endDate: "2027-07-07",
      priceMinor: 790_000,
      status: "confirmed",
    },
    {
      termId: T2,
      label: "2. turnus",
      startDate: "2027-07-15",
      endDate: "2027-07-21",
      priceMinor: 390_000,
      status: "waitlisted",
    },
  ],
  amountDueMinor: 790_000,
  paidMinor: 190_000,
  balanceMinor: 600_000,
  paymentState: "partial",
  ...overrides,
})

function renderSection(filter: RegistrationFilter = {}) {
  const onFilterChange = vi.fn()
  render(
    // No retries, as in the app (config/react-query.ts).
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <RegistrationsSection
        organizationId="org"
        eventId="event"
        terms={TERMS}
        filter={filter}
        onFilterChange={onFilterChange}
      />
    </QueryClientProvider>,
  )
  return { onFilterChange }
}

describe("RegistrationsSection", () => {
  it("lists each registration once with contacts, every term's status, receipt and payment", async () => {
    responses.push({ total: 1, registrations: [registration()] })
    renderSection()

    const row = (await screen.findByText("Eliška Svobodová")).closest("tr")!
    expect(within(row).getByText("eliska@example.test")).toBeInTheDocument()
    expect(within(row).getByText("+420601234567")).toBeInTheDocument()
    const terms = within(row).getAllByRole("listitem")
    expect(terms[0]).toHaveTextContent("1. turnusPotvrzeno")
    expect(terms[1]).toHaveTextContent("2. turnusNáhradník")
    expect(within(row).getByText("10. 10. 2026 9:31")).toBeInTheDocument()
    expect(within(row).getByText("Částečně zaplaceno")).toBeInTheDocument()
    expect(within(row).getByText("Dluh 6 000 Kč")).toBeInTheDocument()
    expect(screen.getByText("Zobrazeno 1 z 1 · od nejstarší přihlášky")).toBeInTheDocument()
  })

  it("tells an event without registrations from filters without a match", async () => {
    responses.push({ total: 0, registrations: [] })
    renderSection()
    expect(await screen.findByText("Tato akce zatím nemá žádné přihlášky.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zrušit filtry" })).not.toBeInTheDocument()
  })

  it("offers to clear filters that match nothing", async () => {
    responses.push({ total: 3, registrations: [] })
    const { onFilterChange } = renderSection({ status: "waitlisted" })
    expect(await screen.findByText("Žádná přihláška neodpovídá filtrům.")).toBeInTheDocument()

    const clear = screen.getAllByRole("button", { name: "Zrušit filtry" })
    await userEvent.click(clear[clear.length - 1]!)
    expect(onFilterChange).toHaveBeenCalledWith({})
  })

  it("never shows a failed first load as an empty list, and retries it", async () => {
    responses.push(new Error("Failed to fetch"))
    renderSection()
    expect(
      await screen.findByText("Data se nepodařilo načíst. Zkuste to znovu."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/nemá žádné přihlášky/)).not.toBeInTheDocument()
    expect(screen.queryByText(/neodpovídá filtrům/)).not.toBeInTheDocument()

    responses.push({ total: 1, registrations: [registration()] })
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Eliška Svobodová")).toBeInTheDocument()
  })

  it("refreshes with the same filters and keeps the last list when that fails", async () => {
    const filter = { termId: T2, status: "waitlisted", payment: "partial" } as const
    responses.push({ total: 4, registrations: [registration()] })
    renderSection(filter)
    await screen.findByText("Eliška Svobodová")

    responses.push(new Error("Failed to fetch"))
    await userEvent.click(screen.getByRole("button", { name: "Aktualizovat" }))
    expect(
      await screen.findByText("Data se nepodařilo načíst. Zkuste to znovu."),
    ).toBeInTheDocument()
    expect(screen.getByText(/z posledního úspěšného načtení/)).toBeInTheDocument()
    expect(screen.getByText("Eliška Svobodová")).toBeInTheDocument()
    expect(screen.queryByText(/^Aktualizováno/)).not.toBeInTheDocument()
    expect(requests).toEqual([filter, filter])
  })

  it("shows progress while refreshing", async () => {
    responses.push({ total: 1, registrations: [registration()] })
    renderSection()
    await screen.findByText("Eliška Svobodová")

    responses.push("never")
    await userEvent.click(screen.getByRole("button", { name: "Aktualizovat" }))
    expect(await screen.findByRole("button", { name: "Aktualizuji…" })).toBeDisabled()
  })

  it("offers only the event's terms and passes a chosen filter on", async () => {
    responses.push({ total: 1, registrations: [registration()] })
    const { onFilterChange } = renderSection({ payment: "partial" })
    await screen.findByText("Eliška Svobodová")

    await userEvent.click(screen.getByRole("combobox", { name: "Termín" }))
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toEqual(["Všechny termíny", "1. turnus", "2. turnus"])
    await userEvent.click(screen.getByRole("option", { name: "2. turnus" }))
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith({ payment: "partial", termId: T2 }),
    )
  })
})
