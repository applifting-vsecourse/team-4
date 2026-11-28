// Brand → Směr C → Seznam přihlášek (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: black sidebar, a large title with the count, a strip of mono figures, status filter
// as underlined text, a dense grid with dot + text statuses, three mono amount columns and a row menu.
import {
  RiArrowRightLine,
  RiBankCardLine,
  RiCalendarEventLine,
  RiCloseLine,
  RiDashboardLine,
  RiFileList3Line,
  RiHotelBedLine,
  RiMore2Fill,
  RiRefreshLine,
  RiSearchLine,
  RiSettings3Line,
} from "@remixicon/react"

import { BrandMark } from "@/components/BrandMark"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

import {
  EVENT,
  EVENT_NAV,
  LIST,
  PAYMENT_STATUS_LABELS,
  REGISTRATION_TABS,
  registrationHref,
  REGISTRATIONS,
  REMAINING,
  TERM_STATUS_LABELS,
  type ListState,
  type NavKey,
  type PaymentStatus,
  type TermStatus,
} from "@/features/brand/data"

const NAV_ICONS: Record<NavKey, typeof RiDashboardLine> = {
  overview: RiDashboardLine,
  registrations: RiFileList3Line,
  payments: RiBankCardLine,
  rooms: RiHotelBedLine,
  programme: RiCalendarEventLine,
  settings: RiSettings3Line,
}

const TERM_DOT: Record<TermStatus, string> = {
  confirmed: "bg-success",
  waitlisted: "bg-warning",
  pending: "bg-muted-foreground",
  cancelled: "border border-muted-foreground",
}

const PAYMENT_DOT: Record<PaymentStatus, string> = {
  none: "border border-muted-foreground",
  unpaid: "bg-muted-foreground",
  partial: "bg-warning",
  paid: "bg-success",
}

function Status({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", dot)}
      />
      {label}
    </span>
  )
}

function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-8 bg-sidebar px-4 py-5 text-sidebar-foreground">
      <BrandMark />
      <p className="font-mono text-xs leading-relaxed tracking-wider uppercase">
        {EVENT.organization}
        <span className="block">{EVENT.name}</span>
      </p>
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
                      ? "flex items-center gap-3 rounded-sm bg-sidebar-primary px-2 py-1.5 text-sm font-medium text-sidebar-primary-foreground"
                      : "flex items-center gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-sidebar-accent"
                  }
                >
                  <NavIcon
                    aria-hidden
                    className="size-4 shrink-0"
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

function Head({ children, isNumeric = false }: { children: string; isNumeric?: boolean }) {
  return (
    <TableHead className={isNumeric ? "text-right" : undefined}>
      <span className="font-mono text-xs tracking-wider uppercase">{children}</span>
    </TableHead>
  )
}

function Rows() {
  return REGISTRATIONS.map((registration) => (
    <TableRow key={registration.id}>
      <TableCell className="align-top">
        <a
          href={registrationHref(registration.id)}
          className="block max-w-52 font-medium break-words whitespace-normal hover:underline"
        >
          {registration.name}
        </a>
        <span className="block max-w-52 truncate text-xs text-muted-foreground">
          {registration.email}
        </span>
      </TableCell>
      <TableCell className="align-top whitespace-normal">
        <ul className="space-y-1">
          {registration.terms.map((term) => (
            <li
              key={term.label}
              className="flex items-baseline gap-3"
            >
              <span className="w-28 shrink-0 truncate">{term.label}</span>
              <Status
                dot={TERM_DOT[term.status]}
                label={TERM_STATUS_LABELS[term.status]}
              />
            </li>
          ))}
        </ul>
      </TableCell>
      <TableCell className="text-right align-top">
        <span className="block font-mono font-semibold tabular-nums">
          {REMAINING[registration.id]}
        </span>
        <span className="text-xs text-muted-foreground">
          <Status
            dot={PAYMENT_DOT[registration.payment]}
            label={PAYMENT_STATUS_LABELS[registration.payment]}
          />
        </span>
      </TableCell>
      <TableCell className="text-right align-top">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Akce přihlášky ${registration.name}`}
              >
                <RiMore2Fill aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Zaznamenat platbu</DropdownMenuItem>
              <DropdownMenuItem>Napsat e-mail</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
          >
            <a
              href={registrationHref(registration.id)}
              aria-label={`Detail přihlášky ${registration.name}`}
            >
              <RiArrowRightLine aria-hidden />
            </a>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  ))
}

function NoRows({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="border-y border-foreground">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <RiSearchLine aria-hidden /> : <RiFileList3Line aria-hidden />}
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
              <RiCloseLine aria-hidden />
              Zrušit filtry
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  )
}

export function RegistrationsC({ state = "ready" }: { state?: ListState }) {
  const hasTable = state === "ready" || state === "loading"
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-8 px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="flex items-baseline gap-4 text-5xl leading-none">
              Přihlášky
              <span className="font-mono text-2xl text-primary tabular-nums">{LIST.total}</span>
            </h1>
            <Button variant="outline">
              <RiRefreshLine aria-hidden />
              Aktualizovat
            </Button>
          </div>
          <nav aria-label="Přihlášky">
            <ul className="flex gap-6 border-b border-foreground">
              {REGISTRATION_TABS.map((tab) => (
                <li key={tab.label}>
                  <a
                    href={tab.href}
                    aria-current={tab.isActive ? "page" : undefined}
                    className={
                      tab.isActive
                        ? "-mb-px block border-b-4 border-primary pb-2 text-sm font-semibold"
                        : "-mb-px block border-b-4 border-transparent pb-2 text-sm text-muted-foreground hover:text-foreground"
                    }
                  >
                    {tab.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div
            role="group"
            aria-label="Rychlé filtry"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            {LIST.counts.map((chip, index) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={index === 0}
                className={
                  index === 0
                    ? "flex items-baseline gap-2 border-b-2 border-foreground pb-1.5 text-sm font-semibold"
                    : "flex items-baseline gap-2 border-b-2 border-transparent pb-1.5 text-sm text-muted-foreground hover:border-border hover:text-foreground"
                }
              >
                {chip.label}
                <span className="font-mono tabular-nums">{chip.count}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <InputGroup className="w-56">
              <InputGroupAddon>
                <RiSearchLine aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Hledat"
                placeholder="Hledat"
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
          </div>
        </div>

        {hasTable ? (
          <div className="border-t border-foreground">
            <Table containerLabel="Tabulka přihlášek">
              <TableHeader>
                <TableRow>
                  <Head>Účastník</Head>
                  <Head>Termíny</Head>
                  <Head isNumeric>Zbývá zaplatit</Head>
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
                className="space-y-px"
              >
                {[1, 2, 3, 4, 5].map((row) => (
                  <Skeleton
                    key={row}
                    className="h-11 w-full"
                  />
                ))}
              </LoadingBlock>
            ) : null}
          </div>
        ) : null}
        {state === "no-results" ? <NoRows isFiltered /> : null}
        {state === "empty" ? <NoRows isFiltered={false} /> : null}

        {state === "ready" ? (
          <p className="font-mono text-xs text-muted-foreground">
            {LIST.shown} / {LIST.total} · {LIST.updated}
          </p>
        ) : null}
      </main>
    </div>
  )
}
