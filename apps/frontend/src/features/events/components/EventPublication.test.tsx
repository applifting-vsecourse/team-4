import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventKeys } from "@/features/events/api/eventQueryOptions"
import { type EventDetail } from "@/features/events/api/eventSchemas"
import { EventPublication } from "@/features/events/components/EventPublication"

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
  isPublished: false,
  openingBlockers: [],
}

function Page() {
  const { data } = useQuery<EventDetail>({
    queryKey: eventKeys.detail(ORGANIZATION_ID, EVENT_ID),
    queryFn: () => Promise.reject(new Error("not refetched in this test")),
    staleTime: Infinity,
  })
  return data ? (
    <EventPublication
      organizationId={ORGANIZATION_ID}
      event={data}
    />
  ) : null
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(eventKeys.detail(ORGANIZATION_ID, EVENT_ID), EVENT)
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>,
  )
}

const toggle = () => screen.getByRole("switch", { name: "Zveřejnit ve veřejném katalogu" })

describe("EventPublication", () => {
  beforeEach(() => put.mockReset())

  it("shows the published state only after the server saved it", async () => {
    put.mockReturnValue({ json: () => Promise.resolve({ ...EVENT, isPublished: true }) })
    renderPage()
    expect(toggle()).not.toBeChecked()

    await userEvent.click(toggle())

    await waitFor(() => expect(toggle()).toBeChecked())
    expect(put).toHaveBeenCalledWith(expect.stringContaining(`/events/${EVENT_ID}/publication`), {
      json: { isPublished: true },
    })
  })

  it("keeps the saved state and shows an error when saving fails, then allows a retry", async () => {
    put.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    renderPage()

    await userEvent.click(toggle())

    expect(await screen.findByText(/nepodařilo uložit/)).toBeInTheDocument()
    expect(toggle()).not.toBeChecked()

    put.mockReturnValueOnce({ json: () => Promise.resolve({ ...EVENT, isPublished: true }) })
    await userEvent.click(toggle())

    await waitFor(() => expect(toggle()).toBeChecked())
    expect(screen.queryByText(/nepodařilo uložit/)).not.toBeInTheDocument()
  })
})
