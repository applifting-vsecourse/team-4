import type { ReactNode } from "react"
import { Link, useParams } from "@tanstack/react-router"
import { BarChart3, CalendarCog } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { OrganizationSwitcher } from "@/features/organizations/components/OrganizationSwitcher"

type OrganizationSidebarProps = {
  eventNavigation: ReactNode
  organizationId: string
  /** Signed-in organizer and sign-out, from the auth feature. */
  footer: ReactNode
}

export function OrganizationSidebar({
  organizationId,
  footer,
  eventNavigation,
}: OrganizationSidebarProps) {
  const { eventId } = useParams({ strict: false })
  const isEventsActive = !eventId

  return (
    <Sidebar>
      <SidebarHeader className="gap-6 p-4">
        <Link
          to={ROUTES.home}
          className="rounded-sm tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50"
        >
          <BrandMark isLarge />
        </Link>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Organizace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isEventsActive}
              >
                <Link
                  to={ROUTES.organization}
                  params={{ organizationId }}
                >
                  <CalendarCog />
                  <span>Akce a turnusy</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <BarChart3 aria-hidden />
                <span>Reporty</span>
                <Badge
                  variant="secondary"
                  className="ml-auto"
                >
                  Připravujeme
                </Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {eventId ? (
          <SidebarGroup>
            <SidebarGroupLabel>Akce</SidebarGroupLabel>
            {eventNavigation}
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">{footer}</SidebarFooter>
    </Sidebar>
  )
}
