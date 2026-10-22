import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { organizationKeys } from "@/features/organizations/api/organizationQueryOptions"
import { type Organization } from "@/features/organizations/api/organizationSchemas"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { rememberOrganization } from "@/features/organizations/lib/lastOrganization"

vi.mock("@/lib/api-client", () => ({ api: {} }))

// The link target is what matters: render it as a plain href.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params?: { organizationId: string }
  }) => <a href={to.replace("$organizationId", params?.organizationId ?? "")}>{children}</a>,
}))

const A1 = { id: "a1", name: "Horolezci" }
const A2 = { id: "a2", name: "Skauti" }

function renderButton(organizations: Organization[], props: { organizationId?: string }) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(organizationKeys.list(), organizations)
  render(
    <QueryClientProvider client={queryClient}>
      <BackToEventsButton
        {...props}
        userId="user-a"
      />
    </QueryClientProvider>,
  )
}

describe("BackToEventsButton", () => {
  afterEach(() => localStorage.clear())

  it("returns to the events of the own organization in the URL", () => {
    rememberOrganization("user-a", "a1")
    renderButton([A1, A2], { organizationId: "a2" })
    expect(screen.getByRole("link", { name: "Zpět na přehled akcí" })).toHaveAttribute(
      "href",
      "/organizations/a2",
    )
  })

  it("never returns to a foreign organization from the URL, but to the last used own one", () => {
    rememberOrganization("user-a", "a2")
    renderButton([A1, A2], { organizationId: "b1" })
    expect(screen.getByRole("link", { name: "Zpět na přehled akcí" })).toHaveAttribute(
      "href",
      "/organizations/a2",
    )
  })

  it("returns to the first own organization by name without a remembered one", () => {
    renderButton([A1, A2], { organizationId: "b1" })
    expect(screen.getByRole("link", { name: "Zpět na přehled akcí" })).toHaveAttribute(
      "href",
      "/organizations/a1",
    )
  })

  it("offers to create the first organization to an organizer without one", () => {
    renderButton([], { organizationId: "b1" })
    expect(screen.getByRole("link", { name: "Založit organizaci" })).toHaveAttribute(
      "href",
      "/organizations/new",
    )
    expect(screen.queryByText("Zpět na přehled akcí")).not.toBeInTheDocument()
  })
})
