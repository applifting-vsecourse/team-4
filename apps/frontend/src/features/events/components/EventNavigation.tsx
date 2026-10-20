import { Link, useMatchRoute } from "@tanstack/react-router"
import { BedDouble, ClipboardList, CreditCard, LayoutDashboard, Mail, Settings } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

const sections = [
  { label: "Přehled", icon: LayoutDashboard, to: ROUTES.event },
  { label: "Nastavení", icon: Settings, to: ROUTES.eventSettings },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble, to: ROUTES.eventRooms },
  { label: "Komunikace", icon: Mail },
] as const

type Props = { organizationId: string; eventId: string; isSidebar?: boolean }

export function EventNavigation({ organizationId, eventId, isSidebar = false }: Props) {
  const matchRoute = useMatchRoute()
  const params = { organizationId, eventId }
  const orderedSections = isSidebar ? [sections[0], ...sections.slice(2), sections[1]] : sections
  const items = orderedSections
    .filter((section) => isSidebar || !("to" in section && section.to === ROUTES.event))
    .map((section) => {
      const to = "to" in section ? section.to : undefined
      const content = (
        <>
          <section.icon
            className="size-4 shrink-0"
            aria-hidden
          />
          <span>{section.label}</span>
          {!to && (
            <Badge
              variant="secondary"
              className="ml-auto"
            >
              Připravujeme
            </Badge>
          )}
        </>
      )
      const isActive = to
        ? Boolean(matchRoute({ to, params })) ||
          (to === ROUTES.eventSettings && Boolean(matchRoute({ to: ROUTES.editEvent, params })))
        : false
      if (isSidebar) {
        return (
          <SidebarMenuItem key={section.label}>
            {to ? (
              <SidebarMenuButton
                asChild
                isActive={isActive}
              >
                <Link
                  to={to}
                  params={params}
                >
                  {content}
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                disabled
                aria-label={`${section.label} Připravujeme`}
              >
                {content}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        )
      }
      return (
        <li key={section.label}>
          {to ? (
            <Button
              asChild
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-4 whitespace-normal"
            >
              <Link
                to={to}
                params={params}
              >
                {content}
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              aria-label={`${section.label} Připravujeme`}
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-4 whitespace-normal"
            >
              {content}
            </Button>
          )}
        </li>
      )
    })
  return isSidebar ? (
    <SidebarMenu>{items}</SidebarMenu>
  ) : (
    <nav aria-label="Části akce">
      <ul className="grid gap-3 sm:grid-cols-2">{items}</ul>
    </nav>
  )
}
