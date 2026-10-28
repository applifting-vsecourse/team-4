import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventKeys } from "@/features/events/api/eventQueryOptions"
import { type EventDetail } from "@/features/events/api/eventSchemas"
import { PublicationSection } from "@/features/events/components/PublicationSection"

const put = vi.fn()

vi.mock("@/lib/api-client", () => ({
  api: { put: (...args: unknown[]) => put(...args) as unknown },
  HTTPError: class HTTPError extends Error {},
}))

const ORGANIZATION_ID = "0190c0de-0000-7000-8000-000000000001"
const EVENT_ID = "0190c0de-0000-7000-8000-000000000002"

const PUBLISHED: EventDetail = {
  id: EVENT_ID,
  name: "Tábor",
  description: "Popis",
  location: "Podlesí",
  status: "open",
  isLocked: true,
  terms: [],
  paymentSettings: null,
  publicId: "abcdefghijkl",
  openingBlockers: [],
  isPublished: true,
}

function Page() {
  const { data } = useQuery<EventDetail>({
    queryKey: eventKeys.detail(ORGANIZATION_ID, EVENT_ID),
    queryFn: () => Promise.reject(new Error("not refetched in this test")),
    staleTime: Infinity,
  })
  return data ? (
    <PublicationSection
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

const publicationSwitch = () =>
  screen.getByRole("switch", { name: "Zveřejnit ve veřejném katalogu" })

describe("PublicationSection", () => {
  beforeEach(() => {
    put.mockReset()
  })

  it("takes the event down and keeps its registration status", async () => {
    put.mockReturnValue({ json: () => Promise.resolve({ ...PUBLISHED, isPublished: false }) })
    renderPage(PUBLISHED)

    await userEvent.click(publicationSwitch())

    expect(put).toHaveBeenCalledWith(
      `organizations/${ORGANIZATION_ID}/events/${EVENT_ID}/publication`,
      { json: { isPublished: false } },
    )
    expect(await screen.findByText(/Akce v katalogu není/)).toBeInTheDocument()
    expect(publicationSwitch()).not.toBeChecked()
  })

  it("keeps the saved state and allows a retry when the change fails", async () => {
    put.mockReturnValue({ json: () => Promise.reject(new Error("network")) })
    renderPage(PUBLISHED)

    await userEvent.click(publicationSwitch())

    expect(await screen.findByText(/nepodařilo uložit/)).toBeInTheDocument()
    expect(publicationSwitch()).toBeChecked()
    expect(publicationSwitch()).toBeEnabled()
  })
})
