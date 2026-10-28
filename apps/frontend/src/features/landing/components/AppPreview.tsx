import {
  BedDouble,
  CalendarCog,
  LayoutDashboard,
  Plus,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Static picture of the organizer's "Akce a turnusy" screen.
// Navigation lists only what Sprint 2 delivers; sample events are for adults.

type NavItem = { label: string; icon: LucideIcon; isActive?: boolean }

const EVENT_NAV: NavItem[] = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: Users },
  { label: "Platby", icon: WalletCards },
  { label: "Ubytování", icon: BedDouble },
]

const ORGANIZATION_NAV: NavItem[] = [{ label: "Akce a turnusy", icon: CalendarCog, isActive: true }]

type SampleEvent = {
  name: string
  description: string
  place: string
  period: string
  terms: number
  status: { label: string; variant: "secondary" | "outline" | "ghost" }
  isSelected?: boolean
}

const SAMPLE_EVENTS: SampleEvent[] = [
  {
    name: "Lesní dobrodružství 2027",
    description: "Letní pobyt v přírodě",
    place: "Podlesí",
    period: "4. 7. – 8. 8. 2027",
    terms: 3,
    status: { label: "Koncept", variant: "secondary" },
    isSelected: true,
  },
  {
    name: "Zimní expedice 2027",
    description: "Zimní pobyt na horách",
    place: "Horní Malá Úpa",
    period: "12. 2. – 19. 2. 2027",
    terms: 1,
    status: { label: "Přihlašování otevřeno", variant: "outline" },
  },
  {
    name: "Podzimní víkend 2026",
    description: "Vodácký víkend pro dospělé",
    place: "Sázava",
    period: "23. 10. – 25. 10. 2026",
    terms: 1,
    status: { label: "Přihlašování zavřeno", variant: "ghost" },
  },
]

// Decorative: hidden from assistive tech and inert, so its controls are not focusable.
export function AppPreview() {
  return (
    <div
      aria-hidden
      inert
      className="hidden h-113 w-full overflow-hidden rounded-xl border bg-background text-left select-none lg:flex"
    >
      <nav className="flex w-44 shrink-0 flex-col gap-5 border-r border-sidebar-border bg-sidebar p-2.5 text-sidebar-foreground">
        <div className="p-1.5">
          <BrandMark />
        </div>
        <NavGroup
          label="Správa akce"
          items={EVENT_NAV}
        />
        <NavGroup
          label="Organizace"
          items={ORGANIZATION_NAV}
        />
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-1.5 border-b px-6 text-xs">
          <span className="text-muted-foreground">Organizace</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Akce a turnusy</span>
        </div>
        <div className="flex items-start justify-between px-6 pt-5 pb-16">
          <p className="text-h3">Akce a turnusy</p>
          <Button size="sm">
            <Plus />
            Nová akce
          </Button>
        </div>
        <div className="px-6">
          <Card className="gap-2 p-3">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium">Akce</p>
              <Input
                placeholder="Hledat akci…"
                className="h-8 w-48"
              />
            </div>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Akce</TableHead>
                  <TableHead>Místo</TableHead>
                  <TableHead>Období</TableHead>
                  <TableHead>Termíny</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_EVENTS.map((event) => (
                  <TableRow
                    key={event.name}
                    className={cn(event.isSelected && "bg-muted/50")}
                  >
                    <TableCell>
                      <p>{event.name}</p>
                      <p className="text-muted-foreground">{event.description}</p>
                    </TableCell>
                    <TableCell>{event.place}</TableCell>
                    <TableCell>{event.period}</TableCell>
                    <TableCell>{event.terms}</TableCell>
                    <TableCell>
                      <Badge variant={event.status.variant}>{event.status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={event.isSelected ? "secondary" : "ghost"}
                        size="xs"
                      >
                        {event.isSelected ? "Vybráno" : "Otevřít"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  )
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 py-1.5 text-xs font-medium opacity-70">{label}</p>
      <ul className="flex flex-col gap-1">
        {items.map(({ label: itemLabel, icon: Icon, isActive }) => (
          <li
            key={itemLabel}
            className={cn(
              "flex h-7 items-center gap-2 rounded-md px-2 text-xs",
              isActive && "bg-sidebar-primary font-medium text-sidebar-primary-foreground",
            )}
          >
            <Icon className="size-4" />
            {itemLabel}
          </li>
        ))}
      </ul>
    </div>
  )
}
