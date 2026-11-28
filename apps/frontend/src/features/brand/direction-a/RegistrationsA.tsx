// Brand → Směr A → Seznam přihlášek (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: quiet light sidebar; page tabs are links to other pages of Přihlášky. The list's own
// filters sit in the card of the table they narrow, with labels as in the app, and every active
// filter shows as a removable chip beside the result count. The table keeps one fact per column:
// a registration with more terms takes one line per term, its other cells span those lines.
import { useState } from "react"
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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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
  FACETS,
  LIST,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  REGISTRATION_TABS,
  registrationHref,
  REGISTRATIONS,
  TERM_STATUS_LABELS,
  TERM_STATUS_TONE,
  type BrandRegistration,
  type ListState,
  type NavKey,
  type PaymentStatus,
  type TermStatus,
} from "@/features/brand/data"

const NAV_ICONS: Record<NavKey, Icon> = {
  overview: SquaresFourIcon,
  registrations: ClipboardTextIcon,
  payments: CreditCardIcon,
  rooms: BedIcon,
  programme: CalendarDotsIcon,
  settings: GearSixIcon,
}

/** Filters of the list; an absent key means "all". */
export type ListFilterA = {
  q?: string
  term?: string
  status?: TermStatus
  payment?: PaymentStatus
}

// A select cannot hold an empty value, so "no filter" has its own.
const ALL = "all"

const STATUS_OPTIONS = FACETS.participation.map((facet) => ({
  value: (Object.keys(TERM_STATUS_LABELS) as TermStatus[]).find(
    (status) => TERM_STATUS_LABELS[status] === facet.label,
  ),
  label: facet.label,
  count: facet.count,
}))

const PAYMENT_OPTIONS = FACETS.payment.map((facet) => ({
  value: (Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).find(
    (payment) => PAYMENT_STATUS_LABELS[payment] === facet.label,
  ),
  label: facet.label,
  count: facet.count,
}))

const TERM_OPTIONS = FACETS.terms.map((facet) => ({
  value: facet.label,
  label: facet.label,
  count: facet.count,
}))

// Facet labels may be shortened ("Instruktorský víkend"), so a term matches by its start.
const hasTerm = (registration: BrandRegistration, term: string) =>
  registration.terms.some((item) => item.label.startsWith(term))

function matches(registration: BrandRegistration, filter: ListFilterA) {
  const q = filter.q?.trim().toLocaleLowerCase("cs")
  return (
    (!q ||
      registration.name.toLocaleLowerCase("cs").includes(q) ||
      registration.email.toLocaleLowerCase("cs").includes(q)) &&
    (!filter.term || hasTerm(registration, filter.term)) &&
    (!filter.status || registration.terms.some((term) => term.status === filter.status)) &&
    (!filter.payment || registration.payment === filter.payment)
  )
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

/** Links to the pages of Přihlášky: a click opens another page, it does not filter this one. */
function PageTabs() {
  return (
    <nav
      aria-label="Stránky přihlášek"
      className="border-b"
    >
      <ul className="-mb-px flex gap-6">
        {REGISTRATION_TABS.map((tab) => (
          <li key={tab.label}>
            <a
              href={tab.href}
              aria-current={tab.isActive ? "page" : undefined}
              className={
                tab.isActive
                  ? "flex items-center gap-2 border-b-2 border-primary py-2.5 text-sm font-medium"
                  : "flex items-center gap-2 border-b-2 border-transparent py-2.5 text-sm text-muted-foreground hover:border-border hover:text-foreground"
              }
            >
              {tab.label}
              {tab.count === undefined ? null : (
                <Badge variant={tab.isActive ? "default" : "secondary"}>{tab.count}</Badge>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function FilterSelect({
  id,
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  allLabel: string
  value: string | undefined
  options: { value: string | undefined; label: string; count: number }[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.label}
              value={option.value ?? option.label}
            >
              {option.label}
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {option.count}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function Filters({
  filter,
  onChange,
}: {
  filter: ListFilterA
  onChange: (filter: ListFilterA) => void
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-3 sm:items-end xl:grid-cols-5">
      <Field className="min-w-0 sm:col-span-3 xl:col-span-2">
        <FieldLabel htmlFor="a-filter-search">Hledat účastníka</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="a-filter-search"
            role="searchbox"
            placeholder="Jméno nebo e-mail"
            value={filter.q ?? ""}
            onChange={(event) => onChange({ ...filter, q: event.currentTarget.value || undefined })}
          />
          {filter.q ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Vymazat hledání"
                onClick={() => onChange({ ...filter, q: undefined })}
              >
                <XIcon aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </Field>
      <FilterSelect
        id="a-filter-term"
        label="Termín"
        allLabel="Všechny termíny"
        value={filter.term}
        options={TERM_OPTIONS}
        onChange={(term) => onChange({ ...filter, term })}
      />
      <FilterSelect
        id="a-filter-status"
        label="Stav účasti"
        allLabel="Všechny stavy"
        value={filter.status}
        options={STATUS_OPTIONS}
        onChange={(status) => onChange({ ...filter, status: status as TermStatus | undefined })}
      />
      <FilterSelect
        id="a-filter-payment"
        label="Platba"
        allLabel="Všechny platby"
        value={filter.payment}
        options={PAYMENT_OPTIONS}
        onChange={(payment) =>
          onChange({ ...filter, payment: payment as PaymentStatus | undefined })
        }
      />
    </div>
  )
}

/** What the filters did: the result count and one removable chip per active filter. */
function ActiveFilters({
  filter,
  shown,
  onChange,
}: {
  filter: ListFilterA
  shown: number
  onChange: (filter: ListFilterA) => void
}) {
  const chips = [
    filter.q?.trim() ? { key: "q" as const, label: `Hledání: „${filter.q.trim()}“` } : null,
    filter.term ? { key: "term" as const, label: `Termín: ${filter.term}` } : null,
    filter.status
      ? { key: "status" as const, label: `Stav účasti: ${TERM_STATUS_LABELS[filter.status]}` }
      : null,
    filter.payment
      ? { key: "payment" as const, label: `Platba: ${PAYMENT_STATUS_LABELS[filter.payment]}` }
      : null,
  ].filter((chip) => chip !== null)

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 px-4 py-2">
      <p
        aria-live="polite"
        className="mr-2 text-sm"
      >
        {chips.length === 0 ? (
          <>
            Všechny přihlášky{" "}
            <span className="font-mono text-muted-foreground tabular-nums">{LIST.total}</span>
          </>
        ) : (
          <>
            Zobrazeno <span className="font-mono tabular-nums">{shown}</span> z{" "}
            <span className="font-mono tabular-nums">{LIST.total}</span>
          </>
        )}
      </p>
      {chips.length > 0 ? (
        <ul
          aria-label="Použité filtry"
          className="flex flex-wrap items-center gap-2"
        >
          {chips.map((chip) => (
            <li key={chip.key}>
              <Button
                variant="secondary"
                size="xs"
                aria-label={`Zrušit filtr ${chip.label}`}
                onClick={() => onChange({ ...filter, [chip.key]: undefined })}
              >
                {chip.label}
                <XIcon aria-hidden />
              </Button>
            </li>
          ))}
          <li>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onChange({})}
            >
              Zrušit filtry
            </Button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

function RegistrationsTable({
  rows,
  isLoading,
}: {
  rows: BrandRegistration[]
  isLoading: boolean
}) {
  return (
    <>
      <Table containerLabel="Tabulka přihlášek">
        <TableHeader>
          <TableRow>
            <TableHead>Účastník</TableHead>
            <TableHead>Termín</TableHead>
            <TableHead>Stav účasti</TableHead>
            <TableHead>Platba</TableHead>
            <TableHead className="text-right">Zaplaceno</TableHead>
            <TableHead className="text-right">Celkem</TableHead>
            <TableHead>
              <span className="sr-only">Akce</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? null
            : rows.flatMap((registration) => {
                const span = registration.terms.length
                return registration.terms.map((term, index) => (
                  <TableRow key={`${registration.id}-${term.label}`}>
                    {index === 0 ? (
                      <TableCell
                        rowSpan={span}
                        className="align-top"
                      >
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
                    ) : null}
                    <TableCell className="align-top whitespace-normal">
                      {/* In a following line the term is the row's first cell, which the table
                          pads wider; the margin keeps its text in line with the first term. */}
                      <span
                        className={
                          index === 0
                            ? "block max-w-56 min-w-40 break-words"
                            : "-ml-2 block max-w-56 min-w-40 break-words"
                        }
                      >
                        {term.label}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={TERM_STATUS_TONE[term.status]}>
                        {TERM_STATUS_LABELS[term.status]}
                      </Badge>
                    </TableCell>
                    {index === 0 ? (
                      <>
                        <TableCell
                          rowSpan={span}
                          className="align-top"
                        >
                          <Badge variant={PAYMENT_STATUS_TONE[registration.payment]}>
                            {PAYMENT_STATUS_LABELS[registration.payment]}
                          </Badge>
                        </TableCell>
                        <TableCell
                          rowSpan={span}
                          className="text-right align-top"
                        >
                          <span className="font-mono tabular-nums">
                            {registration.payment === "none" ? "—" : registration.paid}
                          </span>
                        </TableCell>
                        <TableCell
                          rowSpan={span}
                          className="text-right align-top"
                        >
                          <span className="font-mono tabular-nums">
                            {registration.payment === "none" ? "—" : registration.total}
                          </span>
                        </TableCell>
                        <TableCell
                          rowSpan={span}
                          className="text-right align-top"
                        >
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
                      </>
                    ) : null}
                  </TableRow>
                ))
              })}
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
    </>
  )
}

function NoResults({ onReset }: { onReset?: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {onReset ? <MagnifyingGlassIcon aria-hidden /> : <ClipboardTextIcon aria-hidden />}
        </EmptyMedia>
        <EmptyTitle>
          {onReset ? "Žádná přihláška neodpovídá filtrům" : "Tato akce zatím nemá žádné přihlášky"}
        </EmptyTitle>
      </EmptyHeader>
      {onReset ? (
        <EmptyContent>
          <Button
            variant="outline"
            onClick={onReset}
          >
            <XIcon aria-hidden />
            Zrušit filtry
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}

export function RegistrationsA({
  state = "ready",
  initialFilter = state === "no-results" ? { q: "Zuzana" } : {},
}: {
  state?: ListState
  /** Filters set when the screen opens; the visitor can change them. */
  initialFilter?: ListFilterA
}) {
  const [filter, setFilter] = useState<ListFilterA>(initialFilter)
  const isEmpty = state === "empty"
  const isLoading = state === "loading"
  const rows = isEmpty ? [] : REGISTRATIONS.filter((registration) => matches(registration, filter))

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
          <PageTabs />
        </div>

        <Card padding="none">
          {isEmpty ? (
            <NoResults />
          ) : (
            // One child, so the card's gap does not push its strips apart.
            <div>
              <Filters
                filter={filter}
                onChange={setFilter}
              />
              <Separator />
              <ActiveFilters
                filter={filter}
                shown={rows.length}
                onChange={setFilter}
              />
              <Separator />
              {isLoading || rows.length > 0 ? (
                <RegistrationsTable
                  rows={rows}
                  isLoading={isLoading}
                />
              ) : (
                <NoResults onReset={() => setFilter({})} />
              )}
            </div>
          )}
        </Card>

        {state === "ready" ? <p className="text-sm text-muted-foreground">{LIST.updated}</p> : null}
      </main>
    </div>
  )
}
