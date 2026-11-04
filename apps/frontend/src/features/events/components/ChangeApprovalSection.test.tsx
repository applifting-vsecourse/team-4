import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventKeys } from "@/features/events/api/eventQueryOptions"
import { type EventDetail } from "@/features/events/api/eventSchemas"
import { ChangeApprovalSection } from "@/features/events/components/ChangeApprovalSection"

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
  status: "open",
  isLocked: true,
  terms: [],
  paymentSettings: null,
  changeApprovalDays: null,
  publicId: "abcdefghijkl",
  isPublished: false,
  conditions: "",
  contact: null,
  photos: [],
  openingBlockers: [],
}

function Page() {
  const { data } = useQuery<EventDetail>({
    queryKey: eventKeys.detail(ORGANIZATION_ID, EVENT_ID),
    queryFn: () => Promise.reject(new Error("not refetched in this test")),
    staleTime: Infinity,
  })
  return data ? (
    <ChangeApprovalSection
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

const input = () => screen.getByLabelText("Počet dní před začátkem termínu")
const save = () => screen.getByRole("button", { name: "Uložit schvalování změn" })

describe("ChangeApprovalSection", () => {
  beforeEach(() => {
    put.mockReset()
    put.mockImplementation((_url: string, options: { json: { days: number | null } }) => ({
      json: () => Promise.resolve({ ...EVENT, changeApprovalDays: options.json.days }),
    }))
  })

  it("saves the entered days and shows them as the saved setting", async () => {
    renderPage(EVENT)
    expect(screen.getByText("Žádné změny přihlášek nepodléhají vašemu schválení")).toBeVisible()

    await userEvent.type(input(), "14")
    await userEvent.click(save())

    expect(
      await screen.findByText("Schvalujete změny přihlášek od 14 dnů před začátkem termínu"),
    ).toBeVisible()
    expect(put).toHaveBeenCalledWith(expect.stringContaining("/change-approval"), {
      json: { days: 14 },
    })
  })

  it("saves 0 as approval from the start day", async () => {
    renderPage(EVENT)
    await userEvent.type(input(), "0")
    await userEvent.click(save())
    expect(
      await screen.findByText("Schvalujete změny přihlášek ode dne začátku termínu"),
    ).toBeVisible()
  })

  it("removes the setting when the field is emptied", async () => {
    renderPage({ ...EVENT, changeApprovalDays: 7 })
    await userEvent.clear(input())
    await userEvent.click(save())
    expect(
      await screen.findByText("Žádné změny přihlášek nepodléhají vašemu schválení"),
    ).toBeVisible()
    expect(put).toHaveBeenCalledWith(expect.any(String), { json: { days: null } })
  })

  it.each(["-1", "2,5", "abc"])(
    "refuses %s without a request and keeps the entry",
    async (text) => {
      renderPage({ ...EVENT, changeApprovalDays: 7 })
      await userEvent.clear(input())
      await userEvent.type(input(), text)
      await userEvent.click(save())

      expect(await screen.findByText("Zadejte nezáporné celé číslo dní.")).toBeVisible()
      expect(input()).toHaveValue(text)
      expect(put).not.toHaveBeenCalled()
      expect(
        screen.getByText("Schvalujete změny přihlášek od 7 dnů před začátkem termínu"),
      ).toBeVisible()
    },
  )

  it("reports a failed save, keeps the entry and the saved setting, and allows a retry", async () => {
    renderPage({ ...EVENT, changeApprovalDays: 7 })
    put.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    await userEvent.clear(input())
    await userEvent.type(input(), "3")
    await userEvent.click(save())

    expect(await screen.findByText("Uložení se nezdařilo")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Zavřít" }))
    expect(input()).toHaveValue("3")
    expect(
      screen.getByText("Schvalujete změny přihlášek od 7 dnů před začátkem termínu"),
    ).toBeVisible()

    await userEvent.click(save())
    expect(
      await screen.findByText("Schvalujete změny přihlášek od 3 dnů před začátkem termínu"),
    ).toBeVisible()
  })
})
