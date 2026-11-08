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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

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
      // A tile is a card like the summary above it; the whole card is the link
      // (stretched over it). An unfinished section is a faded card, like the
      // disabled entries in the sidebar.
      return (
        <li
          key={section.label}
          aria-disabled={to ? undefined : true}
          className={cn("flex", !to && "opacity-50 select-none")}
        >
          <Card className="group relative min-h-40 w-full justify-between">
            <CardHeader>
              <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
                <section.icon
                  aria-hidden="true"
                  className="size-6 text-muted-foreground"
                />
              </span>
              <CardAction>
                {to ? (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                  />
                ) : (
                  <Badge variant="secondary">Připravujeme</Badge>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              <CardTitle className="wrap-break-word">
                {to ? (
                  <Link
                    to={to}
                    params={params}
                    className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  >
                    {section.label}
                  </Link>
                ) : (
                  section.label
                )}
              </CardTitle>
            </CardContent>
          </Card>
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
