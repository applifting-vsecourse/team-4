import type { CSSProperties } from "react"
import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

import { SidebarAccount } from "@/features/auth/components/SidebarAccount"
import { EventNavigation } from "@/features/events/components/EventNavigation"
import { organizationsQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { OrganizationSidebar } from "@/features/organizations/components/OrganizationSidebar"

// Shell of every page of one organization: sidebar + workspace (Wireframy
// "Navigace" and "Pracovní plocha"). On a phone the sidebar opens as a sheet.
export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId")({
  loader: ({ context }) => context.queryClient.ensureQueryData(organizationsQueryOptions()),
  component: OrganizationShell,
})

// The wireframe's navigation column is 224 px wide.
const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

function OrganizationShell() {
  const { organizationId } = Route.useParams()
  const { eventId } = useParams({ strict: false })

  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <OrganizationSidebar
        eventNavigation={
          eventId ? (
            <EventNavigation
              organizationId={organizationId}
              eventId={eventId}
              isSidebar
            />
          ) : null
        }
        organizationId={organizationId}
        footer={
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <SidebarAccount />
            </div>
            <ThemeSwitcher />
          </div>
        }
      />
      <SidebarInset>
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger aria-label="Otevřít menu" />
          <Link
            to={ROUTES.home}
            className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandMark />
          </Link>
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
