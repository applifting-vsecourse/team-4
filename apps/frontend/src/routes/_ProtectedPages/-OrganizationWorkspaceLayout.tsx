import type { CSSProperties, ReactNode } from "react"
import { Link, useParams } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { WithinMain } from "@/components/MainLandmark"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

import { SidebarAccount } from "@/features/auth/components/SidebarAccount"
import { EventNavigation } from "@/features/events/components/EventNavigation"
import { OrganizationSidebar } from "@/features/organizations/components/OrganizationSidebar"

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

/** Shared organizer workspace shell, with or without an active organization. */
export function OrganizationWorkspaceLayout({
  organizationId,
  children,
}: {
  organizationId?: string
  children: ReactNode
}) {
  const { eventId } = useParams({ strict: false })

  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <OrganizationSidebar
        eventNavigation={
          organizationId && eventId ? (
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
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark />
          </Link>
        </div>
        <WithinMain>{children}</WithinMain>
      </SidebarInset>
    </SidebarProvider>
  )
}
