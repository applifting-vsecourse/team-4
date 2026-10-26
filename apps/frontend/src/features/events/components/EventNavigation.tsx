import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  ArrowUpRight,
  BedDouble,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
} from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

const sections = [
  { label: "Přehled", icon: LayoutDashboard, to: ROUTES.event },
  { label: "Nastavení", icon: Settings, to: ROUTES.eventSettings },
  { label: "Přihlášky", icon: ClipboardList, to: ROUTES.eventRegistrations },
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
      // A section stays active on its sub-pages: Nastavení on editing the event,
      // Přihlášky on the detail of one registration.
      const isActive = to
        ? Boolean(matchRoute({ to, params, fuzzy: to === ROUTES.eventRegistrations })) ||
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
      const tileContent = (
        <span className="flex min-h-28 w-full flex-col justify-between gap-6">
          <span className="flex w-full items-start justify-between gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
              <section.icon
                aria-hidden="true"
                className="size-6 text-muted-foreground"
              />
            </span>
            {to ? (
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              />
            ) : (
              <Badge variant="secondary">Připravujeme</Badge>
            )}
          </span>
          <span className="block w-full min-w-0 text-base font-semibold break-words">
            {section.label}
          </span>
        </span>
      )
      return (
        <li
          key={section.label}
          className="flex"
        >
          {to ? (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="group h-auto min-h-40 w-full flex-col text-left whitespace-normal"
            >
              <Link
                to={to}
                params={params}
              >
                {tileContent}
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              aria-label={`${section.label} Připravujeme`}
              variant="outline"
              size="lg"
              className="h-auto min-h-40 w-full flex-col text-left whitespace-normal"
            >
              {tileContent}
            </Button>
          )}
        </li>
      )
    })
  return isSidebar ? (
    <SidebarMenu>{items}</SidebarMenu>
  ) : (
    <nav aria-label="Části akce">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">{items}</ul>
    </nav>
  )
}
