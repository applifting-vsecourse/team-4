import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventKeys } from "@/features/events/api/eventQueryOptions"
import { type EventDetail } from "@/features/events/api/eventSchemas"
import { PaymentSettingsSection } from "@/features/events/components/PaymentSettingsSection"

const put = vi.fn()

vi.mock("@/lib/api-client", () => ({
  api: { put: (...args: unknown[]) => put(...args) as unknown },
  HTTPError: class HTTPError extends Error {},
}))

const ORGANIZATION_ID = "0190c0de-0000-7000-8000-000000000001"
const EVENT_ID = "0190c0de-0000-7000-8000-000000000002"

const EVENT: EventDetail = {
  id: EVENT_ID,
  name: "Tábor",
  description: "Popis",
  location: "Podlesí",
  status: "draft",
  isLocked: false,
  terms: [],
  paymentSettings: null,
  publicId: "abcdefghijkl",
  openingBlockers: ["terms", "paymentSettings"],
  isPublished: false,
}

const SAVED = {
  bankAccountPrefix: "19",
  bankAccountNumber: "2000145399",
  bankCode: "0800",
  paymentReminderDays: 14,
}

// Mirrors the event page: the section gets the event from the query cache.
function Page() {
  const { data } = useQuery<EventDetail>({
    queryKey: eventKeys.detail(ORGANIZATION_ID, EVENT_ID),
    queryFn: () => Promise.reject(new Error("not refetched in this test")),
    staleTime: Infinity,
  })
  return data ? (
    <PaymentSettingsSection
      organizationId={ORGANIZATION_ID}
      event={data}
    />
  ) : null
}

function renderPage(event: EventDetail) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(eventKeys.detail(ORGANIZATION_ID, EVENT_ID), event)
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>,
  )
}

const field = (name: string | RegExp) => screen.getByLabelText(name)

describe("PaymentSettingsSection", () => {
  beforeEach(() => {
    put.mockReset()
    put.mockReturnValue({
      json: () => Promise.resolve({ ...EVENT, paymentSettings: SAVED }),
    })
  })

  it("shows the missing-settings notice and then the saved values after a save", async () => {
    renderPage(EVENT)
    expect(screen.getByText("Bez platebního nastavení nelze otevřít přihlašování")).toBeVisible()

    await userEvent.type(field("Předčíslí (nepovinné)"), "19")
    await userEvent.type(field("Číslo účtu"), "2000145399")
    await userEvent.type(field("Kód banky"), "0800")
    await userEvent.type(field(/Počet dní do připomenutí platby/), "14")
    await userEvent.click(screen.getByRole("button", { name: "Uložit platební nastavení" }))

    await vi.waitFor(() =>
      expect(
        screen.queryByText("Bez platebního nastavení nelze otevřít přihlašování"),
      ).not.toBeInTheDocument(),
    )
    expect(field("Předčíslí (nepovinné)")).toHaveValue("19")
    expect(field("Číslo účtu")).toHaveValue("2000145399")
    expect(field("Kód banky")).toHaveValue("0800")
    expect(field(/Počet dní do připomenutí platby/)).toHaveValue("14")
  })

  it("disables the button after a successful save and keeps it active after a failed one", async () => {
    renderPage({ ...EVENT, paymentSettings: SAVED })
    const button = screen.getByRole("button", { name: "Uložit platební nastavení" })
    expect(button).toBeDisabled()

    put.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    await userEvent.clear(field(/Počet dní do připomenutí platby/))
    await userEvent.type(field(/Počet dní do připomenutí platby/), "30")
    await userEvent.click(button)
    expect(await screen.findByText(/nepodařilo uložit/)).toBeVisible()
    expect(field(/Počet dní do připomenutí platby/)).toHaveValue("30")
    expect(button).toBeEnabled()

    put.mockReturnValueOnce({
      json: () =>
        Promise.resolve({ ...EVENT, paymentSettings: { ...SAVED, paymentReminderDays: 30 } }),
    })
    await userEvent.click(button)
    await vi.waitFor(() => expect(button).toBeDisabled())
    expect(field(/Počet dní do připomenutí platby/)).toHaveValue("30")
  })

  it("starts from the persisted settings and lets them be edited", async () => {
    renderPage({ ...EVENT, paymentSettings: SAVED })
    expect(field("Číslo účtu")).toHaveValue("2000145399")
    await userEvent.clear(field(/Počet dní do připomenutí platby/))
    await userEvent.type(field(/Počet dní do připomenutí platby/), "30")
    await userEvent.click(screen.getByRole("button", { name: "Uložit platební nastavení" }))
    await vi.waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0]?.[1]).toEqual({ json: { ...SAVED, paymentReminderDays: 30 } })
  })

  it("explains the reminder period and preservation of existing instructions", () => {
    renderPage({ ...EVENT, paymentSettings: SAVED })
    expect(field("Počet dní do připomenutí platby")).toHaveAccessibleDescription(
      "Počítá se od potvrzení účasti.",
    )
    expect(
      screen.getByText(/ponechávají původní účet, počet dní i datum připomenutí/),
    ).toBeVisible()
  })
})
