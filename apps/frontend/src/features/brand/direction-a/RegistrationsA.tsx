// Brand → Směr A → Seznam přihlášek (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: quiet light sidebar, page tabs, one toolbar row (status chips with counts, search,
// selects), a table where each term carries its own status on the same line, row menu at the end.
import {
  ArrowClockwiseIcon,
  BedIcon,
  CalendarDotsIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  DotsThreeIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react"

import { BrandMark } from "@/components/BrandMark"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  TERM_STATUS_LABELS,
  TERM_STATUS_TONE,
  type ListState,
  type NavKey,
} from "@/features/brand/data"

const NAV_ICONS: Record<NavKey, Icon> = {
  overview: SquaresFourIcon,
  registrations: ClipboardTextIcon,
  payments: CreditCardIcon,
  rooms: BedIcon,
  programme: CalendarDotsIcon,
  settings: GearSixIcon,
}

function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="px-2">
        <BrandMark />
      </div>
      <div className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground">{EVENT.organization}</p>
        <p className="text-sm font-semibold">{EVENT.name}</p>
      </div>
      <nav aria-label="Správa akce">
        <ul className="space-y-0.5">
          {EVENT_NAV.map((item) => {
            const NavIcon = NAV_ICONS[item.key]
            return (
              <li key={item.key}>
                <a
                  href={item.href}
                  aria-current={item.isActive ? "page" : undefined}
                  className={
                    item.isActive
                      ? "flex items-center gap-2.5 rounded-md bg-sidebar-primary px-2 py-1.5 text-sm font-medium text-sidebar-primary-foreground"
                      : "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
                  }
                >
                  <NavIcon
                    aria-hidden
                    className="size-4 shrink-0"
                    weight={item.isActive ? "fill" : "regular"}
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

function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="Rychlé filtry"
        className="flex flex-wrap gap-1"
      >
        {LIST.counts.map((chip, index) => (
          <Button
            key={chip.id}
            variant={index === 0 ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={index === 0}
          >
            {chip.label}
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {chip.count}
            </span>
          </Button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <InputGroup className="w-64">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Hledat jméno nebo e-mail"
            placeholder="Hledat jméno nebo e-mail"
          />
        </InputGroup>
        <Select defaultValue={LIST.terms[0]}>
          <SelectTrigger aria-label="Termín">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIST.terms.map((term) => (
              <SelectItem
                key={term}
                value={term}
              >
                {term}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

function RegistrationsTable({ isLoading }: { isLoading: boolean }) {
  return (
    <Card padding="none">
      <Table containerLabel="Tabulka přihlášek">
        <TableHeader>
          <TableRow>
            <TableHead>Účastník</TableHead>
            <TableHead>Termíny a stav účasti</TableHead>
            <TableHead>Platba</TableHead>
            <TableHead className="text-right">Zaplaceno / celkem</TableHead>
            <TableHead>
              <span className="sr-only">Akce</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? null
            : REGISTRATIONS.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell className="align-top">
                    <a
                      href={registrationHref(registration.id)}
                      className="block max-w-56 font-medium break-words whitespace-normal hover:underline"
                    >
                      {registration.name}
                    </a>
                    <span className="block text-xs text-muted-foreground">
                      Přijato {registration.received}
                    </span>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <ul className="space-y-1.5">
                      {registration.terms.map((term) => (
                        <li
                          key={term.label}
                          className="flex items-start gap-2"
                        >
                          <Badge variant={TERM_STATUS_TONE[term.status]}>
                            {TERM_STATUS_LABELS[term.status]}
                          </Badge>
                          <span className="max-w-40 break-words">{term.label}</span>
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
                    <span className="font-mono tabular-nums">
                      {registration.payment === "none" ? (
                        "—"
                      ) : (
                        <>
                          {registration.paid}
                          <span className="text-muted-foreground"> / {registration.total}</span>
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Akce přihlášky ${registration.name}`}
                        >
                          <DotsThreeIcon
                            aria-hidden
                            weight="bold"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Otevřít detail</DropdownMenuItem>
                        <DropdownMenuItem>Zaznamenat platbu</DropdownMenuItem>
                        <DropdownMenuItem>Napsat e-mail</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {isLoading ? (
        <LoadingBlock
          label="Načítání přihlášek"
          className="space-y-3 p-4"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </LoadingBlock>
      ) : null}
    </Card>
  )
}

function NoResults({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="rounded-lg border border-dashed">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <MagnifyingGlassIcon aria-hidden /> : <ClipboardTextIcon aria-hidden />}
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
              <XIcon aria-hidden />
              Zrušit filtry
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  )
}

export function RegistrationsA({ state = "ready" }: { state?: ListState }) {
  const hasRows = state === "ready" || state === "loading"
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-6 px-8 py-6">
        <div className="space-y-4">
          <nav
            aria-label="Drobečková navigace"
            className="text-sm text-muted-foreground"
          >
            {EVENT.organization} / {EVENT.name} / Přihlášky
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl">Přihlášky</h1>
            <Button
              variant="outline"
              size="sm"
            >
              <ArrowClockwiseIcon aria-hidden />
              Aktualizovat
            </Button>
          </div>
          <nav
            aria-label="Přihlášky"
            className="border-b"
          >
            <ul className="-mb-px flex gap-4">
              {REGISTRATION_TABS.map((tab) => (
                <li key={tab.label}>
                  <a
                    href={tab.href}
                    aria-current={tab.isActive ? "page" : undefined}
                    className={
                      tab.isActive
                        ? "flex items-center gap-2 border-b-2 border-primary py-2 text-sm font-medium"
                        : "flex items-center gap-2 border-b-2 border-transparent py-2 text-sm text-muted-foreground hover:text-foreground"
                    }
                  >
                    {tab.label}
                    {tab.count === undefined ? null : (
                      <span className="font-mono text-xs tabular-nums">{tab.count}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Toolbar />

        {hasRows ? <RegistrationsTable isLoading={state === "loading"} /> : null}
        {state === "no-results" ? <NoResults isFiltered /> : null}
        {state === "empty" ? <NoResults isFiltered={false} /> : null}

        {state === "ready" ? (
          <p className="text-sm text-muted-foreground">
            Zobrazeno {LIST.shown} z {LIST.total} · {LIST.updated}
          </p>
        ) : null}
      </main>
    </div>
  )
}
