// Brand → Směr F → Seznam přihlášek (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: navy top bar and a pictogram rail, counts on a departure-board panel that also
// filters, a timetable-like table with banded rows and text actions at the row end.
import {
  ArrowRight,
  Catalog,
  Close,
  Dashboard,
  Hotel,
  OverflowMenuHorizontal,
  Renew,
  Search,
  Settings,
  Time,
  Wallet,
} from "@carbon/icons-react"

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
  REMAINING,
  TERM_STATUS_LABELS,
  TERM_STATUS_TONE,
  type ListState,
  type NavKey,
} from "@/features/brand/data"

const NAV_ICONS: Record<NavKey, typeof Dashboard> = {
  overview: Dashboard,
  registrations: Catalog,
  payments: Wallet,
  rooms: Hotel,
  programme: Time,
  settings: Settings,
}

function Rail() {
  return (
    <nav
      aria-label="Správa akce"
      className="w-24 shrink-0 bg-sidebar py-3 text-sidebar-foreground"
    >
      <ul className="space-y-1 px-2">
        {EVENT_NAV.map((item) => {
          const NavIcon = NAV_ICONS[item.key]
          return (
            <li key={item.key}>
              <a
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                className={
                  item.isActive
                    ? "flex flex-col items-center gap-1 rounded-sm bg-sidebar-primary px-1 py-2 text-xs font-bold text-sidebar-primary-foreground"
                    : "flex flex-col items-center gap-1 rounded-sm px-1 py-2 text-xs hover:bg-sidebar-accent"
                }
              >
                <NavIcon
                  aria-hidden
                  size={24}
                />
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Board() {
  return (
    <div
      role="group"
      aria-label="Rychlé filtry"
      className="grid grid-cols-4 gap-px overflow-hidden rounded-md bg-sidebar-border"
    >
      {LIST.counts.map((chip, index) => (
        <button
          key={chip.id}
          type="button"
          aria-pressed={index === 0}
          className={
            index === 0
              ? "space-y-1 border-b-4 border-primary bg-sidebar-accent px-4 py-3 text-left text-sidebar-foreground"
              : "space-y-1 border-b-4 border-transparent bg-sidebar px-4 py-3 text-left text-sidebar-foreground hover:bg-sidebar-accent"
          }
        >
          <span className="block font-mono text-xs uppercase">{chip.label}</span>
          <span className="block font-mono text-4xl font-bold text-primary tabular-nums">
            {chip.count}
          </span>
        </button>
      ))}
    </div>
  )
}

function Rows() {
  return REGISTRATIONS.map((registration) => (
    <TableRow key={registration.id}>
      <TableCell className="align-top">
        <a
          href={registrationHref(registration.id)}
          className="block max-w-56 font-bold break-words whitespace-normal hover:underline"
        >
          {registration.name}
        </a>
        <span className="block font-mono text-xs text-muted-foreground">{registration.phone}</span>
      </TableCell>
      <TableCell className="align-top">
        <ul className="space-y-1.5">
          {registration.terms.map((term) => (
            <li
              key={term.label}
              className="flex items-center gap-3"
            >
              <span className="w-32 shrink-0 truncate">{term.label}</span>
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
        <span className="font-mono font-bold tabular-nums">{REMAINING[registration.id]}</span>
      </TableCell>
      <TableCell className="text-right align-top">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={registrationHref(registration.id)}>
              Detail
              <ArrowRight
                aria-hidden
                size={16}
              />
            </a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Další akce přihlášky ${registration.name}`}
              >
                <OverflowMenuHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Zaznamenat platbu</DropdownMenuItem>
              <DropdownMenuItem>Napsat e-mail</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  ))
}

function NoRows({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="rounded-md border-l-4 border-primary bg-card">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <Search aria-hidden /> : <Catalog aria-hidden />}
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
              <Close aria-hidden />
              Zrušit filtry
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  )
}

export function RegistrationsF({ state = "ready" }: { state?: ListState }) {
  const hasTable = state === "ready" || state === "loading"
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center gap-6 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
        <BrandMark />
        <p className="min-w-0 truncate font-mono text-sm uppercase">
          {EVENT.organization} / {EVENT.name}
        </p>
      </header>
      <div className="flex flex-1">
        <Rail />
        <main className="min-w-0 flex-1 space-y-6 px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl">Přihlášky</h1>
              <nav aria-label="Přihlášky">
                <ul className="flex gap-1">
                  {REGISTRATION_TABS.map((tab) => (
                    <li key={tab.label}>
                      <a
                        href={tab.href}
                        aria-current={tab.isActive ? "page" : undefined}
                        className={
                          tab.isActive
                            ? "block rounded-sm bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground"
                            : "block rounded-sm px-3 py-1.5 text-sm hover:bg-muted"
                        }
                      >
                        {tab.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <Button
              variant="outline"
              size="sm"
            >
              <Renew aria-hidden />
              Aktualizovat
            </Button>
          </div>

          <Board />

          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="w-72">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Hledat jméno, e-mail nebo telefon"
                placeholder="Jméno, e-mail nebo telefon"
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

          {hasTable ? (
            <Card padding="none">
              <Table containerLabel="Tabulka přihlášek">
                <TableHeader>
                  <TableRow>
                    <TableHead>Účastník</TableHead>
                    <TableHead>Termíny a účast</TableHead>
                    <TableHead>Platba</TableHead>
                    <TableHead className="text-right">Zbývá</TableHead>
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
                  className="space-y-1 p-3"
                >
                  {[1, 2, 3, 4, 5].map((row) => (
                    <Skeleton
                      key={row}
                      className="h-10 w-full"
                    />
                  ))}
                </LoadingBlock>
              ) : null}
            </Card>
          ) : null}
          {state === "no-results" ? <NoRows isFiltered /> : null}
          {state === "empty" ? <NoRows isFiltered={false} /> : null}

          {state === "ready" ? (
            <p className="font-mono text-xs text-muted-foreground uppercase">
              {LIST.shown} z {LIST.total} · {LIST.updated}
            </p>
          ) : null}
        </main>
      </div>
    </div>
  )
}
