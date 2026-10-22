import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventsQueryOptions } from "@/features/events/api/eventQueryOptions"

// Each request answers when the test says so, to finish A1's after A2's.
const pending = new Map<string, (events: unknown[]) => void>()
vi.mock("@/lib/api-client", () => ({
  api: {
    get: (path: string) => ({
      json: () => new Promise((resolve) => pending.set(path, resolve)),
    }),
  },
}))

const event = (id: string, name: string) => ({
  id,
  name,
  description: "",
  location: "",
  status: "draft",
  termCount: 0,
  period: null,
})

function EventNames({ organizationId }: { organizationId: string }) {
  const { data } = useQuery(eventsQueryOptions(organizationId))
  if (!data) return <p>Načítání</p>
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

beforeEach(() => pending.clear())

/** Answers the organization's request once it has been sent. */
const answer = async (organizationId: string, events: unknown[]) => {
  const path = `organizations/${organizationId}/events`
  await waitFor(() => expect(pending.has(path)).toBe(true))
  const resolve = pending.get(path)!
  pending.delete(path)
  await act(() => Promise.resolve(resolve(events)))
}

// S2-03: data belong to the organization of the URL, cached under its id.
describe("events of an organization", () => {
  it("never shows A1's events under A2, even when A1's request finishes last", async () => {
    const queryClient = new QueryClient()
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <EventNames organizationId="a1" />
      </QueryClientProvider>,
    )

    // Switched to A2 before A1 answered.
    rerender(
      <QueryClientProvider client={queryClient}>
        <EventNames organizationId="a2" />
      </QueryClientProvider>,
    )
    expect(screen.getByText("Načítání")).toBeInTheDocument()
    await answer("a2", [event("0190c0de-0000-7000-8000-0000000000a2", "Tábor A2")])
    await answer("a1", [event("0190c0de-0000-7000-8000-0000000000a1", "Tábor A1")])

    expect(await screen.findByText("Tábor A2")).toBeInTheDocument()
    expect(screen.queryByText("Tábor A1")).not.toBeInTheDocument()
  })

  it("keeps each view on the data of its own URL, as two tabs would", async () => {
    // Two tabs share nothing but the server: one query client each.
    render(
      <>
        <QueryClientProvider client={new QueryClient()}>
          <EventNames organizationId="a1" />
        </QueryClientProvider>
        <QueryClientProvider client={new QueryClient()}>
          <EventNames organizationId="a2" />
        </QueryClientProvider>
      </>,
    )
    await answer("a1", [event("0190c0de-0000-7000-8000-0000000000a1", "Tábor A1")])
    await answer("a2", [event("0190c0de-0000-7000-8000-0000000000a2", "Tábor A2")])

    await waitFor(() => expect(screen.getAllByRole("list")).toHaveLength(2))
    const lists = screen.getAllByRole("list")
    expect(lists[0]).toHaveTextContent("Tábor A1")
    expect(lists[0]).not.toHaveTextContent("Tábor A2")
    expect(lists[1]).toHaveTextContent("Tábor A2")
    expect(lists[1]).not.toHaveTextContent("Tábor A1")
  })
})
