import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"
import { SidebarProvider } from "@/components/ui/sidebar"

import { EventNavigation } from "@/features/events/components/EventNavigation"

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})

async function renderNavigation(isSidebar = false) {
  const root = createRootRoute({ component: Outlet })
  const routes = [
    ROUTES.event,
    ROUTES.eventSettings,
    ROUTES.eventRooms,
    ROUTES.editEvent,
    ROUTES.eventRegistrations,
    ROUTES.registration,
  ].map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      component: () => (
        <SidebarProvider>
          <EventNavigation
            organizationId="org-a"
            eventId="event-a"
            isSidebar={isSidebar}
          />
        </SidebarProvider>
      ),
    }),
  )
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: ["/organizations/org-a/events/event-a"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByRole("link", { name: "Nastavení" })
  return router
}

describe("EventNavigation", () => {
  it("opens settings, registrations and rooms within the selected organization and event", async () => {
    const router = await renderNavigation()
    expect(screen.queryByRole("link", { name: "Přehled" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("link", { name: "Nastavení" }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/organizations/org-a/events/event-a/settings"),
    )
    await userEvent.click(screen.getByRole("link", { name: "Přihlášky" }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/organizations/org-a/events/event-a/registrations",
      ),
    )
    await userEvent.click(screen.getByRole("link", { name: "Ubytování" }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/organizations/org-a/events/event-a/rooms"),
    )
  })

  it("keeps unfinished destinations disabled instead of creating links", async () => {
    await renderNavigation()
    for (const name of ["Platby", "Komunikace"]) {
      expect(screen.getByRole("button", { name: `${name} Připravujeme` })).toBeDisabled()
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument()
    }
  })

  it("marks only the current event section active and follows browser history", async () => {
    const router = await renderNavigation(true)
    expect(screen.getByRole("link", { name: "Přehled" })).toHaveAttribute("data-active", "true")
    await userEvent.click(screen.getByRole("link", { name: "Nastavení" }))
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Nastavení" })).toHaveAttribute(
        "data-active",
        "true",
      ),
    )
    expect(screen.getByRole("link", { name: "Přehled" })).toHaveAttribute("data-active", "false")
    router.history.back()
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Přehled" })).toHaveAttribute("data-active", "true"),
    )
  })

  it("keeps Přihlášky active on the detail of one registration", async () => {
    const router = await renderNavigation(true)
    await router.navigate({
      to: ROUTES.registration,
      params: { organizationId: "org-a", eventId: "event-a", registrationId: "registration-a" },
    })
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Přihlášky" })).toHaveAttribute(
        "data-active",
        "true",
      ),
    )
    expect(screen.getByRole("link", { name: "Přehled" })).toHaveAttribute("data-active", "false")
  })
})
