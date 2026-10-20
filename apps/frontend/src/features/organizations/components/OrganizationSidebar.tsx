import type { ReactNode } from "react"
import { Link, useMatchRoute } from "@tanstack/react-router"
import { CalendarCog } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"
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
  organizationId: string
  /** Signed-in organizer and sign-out, from the auth feature. */
  footer: ReactNode
}

// Navigation of one organization (Wireframy "Navigace"). Only items with a
// screen are listed; the wireframe's other items arrive with their stories.
export function OrganizationSidebar({ organizationId, footer }: OrganizationSidebarProps) {
  const matchRoute = useMatchRoute()
  // Event pages belong under "Akce a turnusy" too (Wireframy E1–E7).
  const isEventsActive = Boolean(
    matchRoute({ to: ROUTES.organization, params: { organizationId }, fuzzy: true }),
  )

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
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">{footer}</SidebarFooter>
    </Sidebar>
  )
}
