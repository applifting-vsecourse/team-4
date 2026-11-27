// Brand → Směr B → Seznam přihlášek (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: dark green sidebar, a serif title, four count cards that work as quick filters,
// term switcher as pills, rows with initials, the remaining amount as the deciding figure and
// inline row actions.
import {
  IconBed,
  IconCalendarEvent,
  IconCash,
  IconClipboardList,
  IconCreditCard,
  IconLayoutDashboard,
  IconMail,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconX,
  type Icon,
} from "@tabler/icons-react"

import { BrandMark } from "@/components/BrandMark"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  EVENT,
  EVENT_NAV,
  LIST,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  REGISTRATION_TABS,
  registrationHref,
  REGISTRATIONS,
  REMAINING,
  TERM_STATUS_LABELS,
  TERM_STATUS_TONE,
  type ListState,
  type NavKey,
} from "@/features/brand/data"

const NAV_ICONS: Record<NavKey, Icon> = {
  overview: IconLayoutDashboard,
  registrations: IconClipboardList,
  payments: IconCreditCard,
  rooms: IconBed,
  programme: IconCalendarEvent,
  settings: IconSettings,
}

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-8 bg-sidebar px-4 py-5 text-sidebar-foreground">
      <BrandMark isLarge />
      <div className="space-y-1 rounded-2xl bg-sidebar-accent p-3">
        <p className="text-xs">{EVENT.organization}</p>
        <p className="text-sm font-semibold">{EVENT.name}</p>
      </div>
      <nav aria-label="Správa akce">
        <ul className="space-y-1">
          {EVENT_NAV.map((item) => {
            const NavIcon = NAV_ICONS[item.key]
            return (
              <li key={item.key}>
                <a
                  href={item.href}
                  aria-current={item.isActive ? "page" : undefined}
                  className={
                    item.isActive
                      ? "flex items-center gap-3 rounded-full bg-sidebar-primary px-3 py-2 text-sm font-semibold text-sidebar-primary-foreground"
                      : "flex items-center gap-3 rounded-full px-3 py-2 text-sm hover:bg-sidebar-accent"
                  }
                >
                  <NavIcon
                    aria-hidden
                    className="size-5 shrink-0"
                    stroke={1.75}
                  />
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

function CountCards() {
  return (
    <div
      role="group"
      aria-label="Rychlé filtry"
      className="grid grid-cols-4 gap-3"
    >
      {LIST.counts.map((chip, index) => (
        <button
          key={chip.id}
          type="button"
          aria-pressed={index === 0}
          className={
            index === 0
              ? "space-y-1 rounded-2xl bg-primary p-4 text-left text-primary-foreground"
              : "space-y-1 rounded-2xl bg-card p-4 text-left shadow-sm hover:bg-accent"
          }
        >
          <span className="block font-mono text-3xl font-semibold tabular-nums">{chip.count}</span>
          <span className="block text-sm">{chip.label}</span>
        </button>
      ))}
    </div>
  )
}

function Filters() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="group"
        aria-label="Termín"
        className="flex flex-wrap gap-2"
      >
        {LIST.terms.map((term, index) => (
          <Button
            key={term}
            variant={index === 0 ? "secondary" : "outline"}
            size="sm"
            aria-pressed={index === 0}
          >
            {term}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <InputGroup className="w-60">
          <InputGroupAddon>
            <IconSearch aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Hledat účastníka"
            placeholder="Hledat účastníka"
          />
        </InputGroup>
        <Select defaultValue={LIST.payments[0]}>
          <SelectTrigger aria-label="Platba">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIST.payments.map((payment) => (
              <SelectItem
                key={payment}
                value={payment}
              >
                {payment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function Rows() {
  return REGISTRATIONS.map((registration) => (
    <TableRow key={registration.id}>
      <TableCell className="align-top">
        <div className="flex max-w-72 items-start gap-3">
          <Avatar>
            <AvatarFallback>{initials(registration.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <a
              href={registrationHref(registration.id)}
              className="block font-semibold break-words whitespace-normal hover:underline"
            >
              {registration.name}
            </a>
            <span className="block truncate text-xs text-muted-foreground">
              {registration.phone}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top whitespace-normal">
        <ul className="space-y-2">
          {registration.terms.map((term) => (
            <li
              key={term.label}
              className="space-y-1"
            >
              <span className="block max-w-56 text-sm break-words">{term.label}</span>
              <Badge variant={TERM_STATUS_TONE[term.status]}>
                {TERM_STATUS_LABELS[term.status]}
              </Badge>
            </li>
          ))}
        </ul>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={PAYMENT_STATUS_TONE[registration.payment]}>
          {PAYMENT_STATUS_LABELS[registration.payment]}
        </Badge>
      </TableCell>
      <TableCell className="text-right align-top">
        <span className="block font-mono text-base font-semibold tabular-nums">
          {REMAINING[registration.id]}
        </span>
        {registration.payment === "none" ? null : (
          <span className="block text-xs text-muted-foreground tabular-nums">
            z {registration.total}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right align-top">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Zaznamenat platbu: ${registration.name}`}
          >
            <IconCash aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Napsat e-mail: ${registration.name}`}
          >
            <IconMail aria-hidden />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  ))
}

function NoRows({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="rounded-3xl border-2 border-dashed">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <IconSearch aria-hidden /> : <IconClipboardList aria-hidden />}
          </EmptyMedia>
          <EmptyTitle>
            {isFiltered
              ? "Žádná přihláška neodpovídá filtrům"
              : "Tato akce zatím nemá žádné přihlášky"}
          </EmptyTitle>
        </EmptyHeader>
        {isFiltered ? (
          <EmptyContent>
            <Button variant="outline">
              <IconX aria-hidden />
              Zrušit filtry
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  )
}

export function RegistrationsB({ state = "ready" }: { state?: ListState }) {
  const hasTable = state === "ready" || state === "loading"
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-6 px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{EVENT.name}</p>
            <h1 className="text-4xl">Přihlášky</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav aria-label="Přihlášky">
              <ul className="flex gap-1 rounded-full bg-muted p-1">
                {REGISTRATION_TABS.map((tab) => (
                  <li key={tab.label}>
                    <a
                      href={tab.href}
                      aria-current={tab.isActive ? "page" : undefined}
                      className={
                        tab.isActive
                          ? "block rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-sm"
                          : "block rounded-full px-3 py-1.5 text-sm hover:bg-accent"
                      }
                    >
                      {tab.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <Button
              variant="outline"
              size="icon"
              aria-label="Aktualizovat"
            >
              <IconRefresh aria-hidden />
            </Button>
          </div>
        </div>

        <CountCards />
        <Filters />

        {hasTable ? (
          <Card padding="none">
            <Table containerLabel="Tabulka přihlášek">
              <TableHeader>
                <TableRow>
                  <TableHead>Účastník</TableHead>
                  <TableHead>Termíny</TableHead>
                  <TableHead>Platba</TableHead>
                  <TableHead className="text-right">Zbývá zaplatit</TableHead>
                  <TableHead>
                    <span className="sr-only">Akce</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{state === "ready" ? <Rows /> : null}</TableBody>
            </Table>
            {state === "loading" ? (
              <LoadingBlock
                label="Načítání přihlášek"
                className="space-y-4 p-5"
              >
                {[1, 2, 3, 4].map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-3"
                  >
                    <Skeleton className="size-8" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                ))}
              </LoadingBlock>
            ) : null}
          </Card>
        ) : null}
        {state === "no-results" ? <NoRows isFiltered /> : null}
        {state === "empty" ? <NoRows isFiltered={false} /> : null}

        {state === "ready" ? (
          <p className="text-sm text-muted-foreground">
            {LIST.shown} z {LIST.total} přihlášek · {LIST.updated}
          </p>
        ) : null}
      </main>
    </div>
  )
}
