import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROUTES } from "@/app/routes"

import { EventsTable } from "@/features/events/components/EventsTable"
import { EVENT_SUMMARIES } from "@/features/events/fixtures/events"

async function renderTable() {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: ROUTES.organization,
    component: () => (
      <EventsTable
        organizationId="org-a"
        events={EVENT_SUMMARIES}
      />
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/organizations/org-a"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findAllByRole("row")
}

// The table row that shows the event, located by its name link.
function rowOf(name: string) {
  const row = screen.getByRole("link", { name }).closest("tr")
  if (!row) throw new Error(`No row for ${name}`)
  return row
}

describe("EventsTable", () => {
  // Safari does not position content against a <tr>, so a single link stretched over the
  // row would cover the whole table and every row would open the last event.
  it("links every cell of a row to that row's event", async () => {
    await renderTable()
    expect(screen.getAllByRole("row")).toHaveLength(EVENT_SUMMARIES.length + 1)
    for (const event of EVENT_SUMMARIES) {
      const href = `/organizations/org-a/events/${event.id}`
      for (const cell of within(rowOf(event.name)).getAllByRole("cell")) {
        expect(cell.querySelector("a")).toHaveAttribute("href", href)
      }
    }
  })

  it("exposes one focusable link per event, named after it", async () => {
    await renderTable()
    for (const event of EVENT_SUMMARIES) {
      const row = rowOf(event.name)
      expect(within(row).getAllByRole("link")).toEqual([
        within(row).getByRole("link", { name: event.name }),
      ])
    }
    // The four remaining cells of every row carry a hidden, unfocusable overlay link.
    const hidden = document.querySelectorAll("tbody a[aria-hidden='true']")
    expect(hidden).toHaveLength(EVENT_SUMMARIES.length * 4)
    for (const link of hidden) {
      expect(link).toHaveAttribute("tabindex", "-1")
    }
  })
})
