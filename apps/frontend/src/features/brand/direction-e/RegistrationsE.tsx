// Brand → Směr E → Seznam přihlášek (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: navigation in a printed top bar instead of a sidebar, filters as a column of
// checkboxes with counts, and the table grouped by term so each term's capacity reads at once.
import { Fragment } from "react"
import { ClipboardCheck, Filter, MoreHoriz, Refresh, Search, Xmark } from "iconoir-react"

import { BrandMark } from "@/components/BrandMark"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
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
  REMAINING,
  TERM_STATUS_LABELS,
  TERM_STATUS_TONE,
  TERMS,
  type ListState,
} from "@/features/brand/data"

const GROUP_COUNTS: Record<string, string> = {
  t1: "31 přihlášek · 24 potvrzeno · volno 12",
  t2: "14 přihlášek · plno · 9 náhradníků",
  t3: "7 přihlášek · volno 4",
}

function TopBar() {
  return (
    <header className="bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-8 px-6">
        <BrandMark />
        <p className="min-w-0 truncate text-sm">
          {EVENT.organization} · <span className="font-semibold">{EVENT.name}</span>
        </p>
      </div>
      <nav
        aria-label="Správa akce"
        className="px-6"
      >
        <ul className="flex gap-1">
          {EVENT_NAV.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                className={
                  item.isActive
                    ? "block rounded-t-lg bg-background px-4 py-2 text-sm font-semibold text-foreground"
                    : "block rounded-t-lg px-4 py-2 text-sm hover:bg-sidebar-accent"
                }
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

function FacetGroup({
  id,
  legend,
  options,
  checked,
}: {
  id: string
  legend: string
  options: { label: string; count: number }[]
  checked?: string
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="space-y-2">
        {options.map((option) => (
          <Field
            key={option.label}
            orientation="horizontal"
          >
            <Checkbox
              id={`${id}-${option.label}`}
              defaultChecked={option.label === checked}
            />
            <FieldLabel
              htmlFor={`${id}-${option.label}`}
              className="flex-1"
            >
              <span className="flex flex-1 items-baseline justify-between gap-2 font-normal">
                {option.label}
                <span className="font-mono text-xs tabular-nums">{option.count}</span>
              </span>
            </FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  )
}

function Facets({ isFiltered }: { isFiltered: boolean }) {
  return (
    <aside
      aria-label="Filtry"
      className="w-56 shrink-0 space-y-6"
    >
      <InputGroup>
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Hledat jméno nebo e-mail"
          placeholder="Jméno nebo e-mail"
          defaultValue={isFiltered ? "Nováček" : undefined}
        />
      </InputGroup>
      <FacetGroup
        id="e-participation"
        legend="Stav účasti"
        options={FACETS.participation}
      />
      <FacetGroup
        id="e-payment"
        legend="Platba"
        options={FACETS.payment}
        checked={isFiltered ? "Nezaplaceno" : undefined}
      />
      <FacetGroup
        id="e-terms"
        legend="Termín"
        options={FACETS.terms}
      />
    </aside>
  )
}

function GroupedRows() {
  return TERMS.map((term) => {
    const rows = REGISTRATIONS.flatMap((registration) =>
      registration.terms
        .filter((entry) => entry.label === term.label)
        .map((entry) => ({ registration, status: entry.status })),
    )
    return (
      <Fragment key={term.id}>
        <TableRow>
          <TableCell colSpan={5}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
              <span className="text-base font-bold whitespace-normal">{term.label}</span>
              <span className="font-mono text-xs">{GROUP_COUNTS[term.id]}</span>
            </div>
          </TableCell>
        </TableRow>
        {rows.map(({ registration, status }) => (
          <TableRow key={`${term.id}-${registration.id}`}>
            <TableCell className="align-top">
              <a
                href={registrationHref(registration.id)}
                className="block max-w-56 font-semibold break-words whitespace-normal hover:underline"
              >
                {registration.name}
              </a>
              <span className="block font-mono text-xs text-muted-foreground">
                {registration.received}
              </span>
            </TableCell>
            <TableCell className="align-top">
              <Badge variant={TERM_STATUS_TONE[status]}>{TERM_STATUS_LABELS[status]}</Badge>
            </TableCell>
            <TableCell className="align-top">
              <Badge variant={PAYMENT_STATUS_TONE[registration.payment]}>
                {PAYMENT_STATUS_LABELS[registration.payment]}
              </Badge>
            </TableCell>
            <TableCell className="text-right align-top">
              <span className="font-mono font-semibold tabular-nums">
                {REMAINING[registration.id]}
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
                    <MoreHoriz aria-hidden />
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
      </Fragment>
    )
  })
}

function NoRows({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="rounded-xl border-2 border-dashed">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isFiltered ? <Filter aria-hidden /> : <ClipboardCheck aria-hidden />}
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
              <Xmark aria-hidden />
              Zrušit filtry
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  )
}

export function RegistrationsE({ state = "ready" }: { state?: ListState }) {
  const hasTable = state === "ready" || state === "loading"
  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar />
      <main className="space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              data-decor="halftone"
              className="size-10 shrink-0 rounded-full"
            />
            <h1 className="text-4xl">Přihlášky</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav aria-label="Přihlášky">
              <ul className="flex gap-4 text-sm">
                {REGISTRATION_TABS.map((tab) => (
                  <li key={tab.label}>
                    <a
                      href={tab.href}
                      aria-current={tab.isActive ? "page" : undefined}
                      className={
                        tab.isActive
                          ? "font-semibold underline decoration-primary decoration-4 underline-offset-8"
                          : "text-muted-foreground hover:text-foreground"
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
              size="sm"
            >
              <Refresh aria-hidden />
              Aktualizovat
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-8">
          <Facets isFiltered={state === "no-results"} />
          <div className="min-w-0 flex-1 space-y-3">
            {hasTable ? (
              <Card padding="none">
                <Table containerLabel="Tabulka přihlášek">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Účastník</TableHead>
                      <TableHead>Účast</TableHead>
                      <TableHead>Platba</TableHead>
                      <TableHead className="text-right">Zbývá</TableHead>
                      <TableHead>
                        <span className="sr-only">Akce</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{state === "ready" ? <GroupedRows /> : null}</TableBody>
                </Table>
                {state === "loading" ? (
                  <LoadingBlock
                    label="Načítání přihlášek"
                    className="space-y-3 p-4"
                  >
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-10 w-full" />
                  </LoadingBlock>
                ) : null}
              </Card>
            ) : null}
            {state === "no-results" ? <NoRows isFiltered /> : null}
            {state === "empty" ? <NoRows isFiltered={false} /> : null}
            {state === "ready" ? (
              <p className="font-mono text-xs text-muted-foreground">
                {LIST.shown} z {LIST.total} · {LIST.updated}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
