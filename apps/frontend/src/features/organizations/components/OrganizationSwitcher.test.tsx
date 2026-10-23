import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"

import { organizationKeys } from "@/features/organizations/api/organizationQueryOptions"
import { OrganizationSwitcher } from "@/features/organizations/components/OrganizationSwitcher"

vi.mock("@/lib/api-client", () => ({ api: {} }))

const params = vi.hoisted(() => ({ organizationId: "" }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => params,
}))

// The sidebar asks whether it is on a phone.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})

function renderSwitcher(organizationId: string) {
  params.organizationId = organizationId
  const queryClient = new QueryClient()
  queryClient.setQueryData(organizationKeys.list(), [
    { id: "a1", name: "Horolezci" },
    { id: "a2", name: "Skauti" },
  ])
  render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <OrganizationSwitcher />
      </SidebarProvider>
    </QueryClientProvider>,
  )
}

// S2-03: the active organization is the one of the URL, so a direct link or a
// second tab with another organization shows that one.
describe("OrganizationSwitcher", () => {
  it("shows the own organization of the URL as active", () => {
    renderSwitcher("a2")
    expect(screen.getByRole("button", { name: "Přepnout organizaci" })).toHaveTextContent("Skauti")
  })

  it("names no organization for one that is not own", () => {
    renderSwitcher("b1")
    const trigger = screen.getByRole("button", { name: "Přepnout organizaci" })
    expect(trigger).toHaveTextContent("Organizace")
    expect(trigger).not.toHaveTextContent("Horolezci")
    expect(trigger).not.toHaveTextContent("Skauti")
  })
})
