import type { ReactNode } from "react"

import { ParticipationBadge } from "@/components/ParticipationBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type TermParticipation } from "@/lib/participation"
import { cn } from "@/lib/utils"

/** A personal or contact value, or a part of the needs (F63), the change replaces. */
export type ChangedValue = { label: string; original: string; proposed: string }

/** A term the change touches; null on the side where the term is not part of the registration. */
export type AffectedTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "20. 11. – 22. 11. 2026". */
  dates: string
  /** Already formatted, e.g. "2 400 Kč". */
  price: string
  original: TermParticipation | null
  proposed: TermParticipation | null
}

/** One line of the price and balance, already formatted. */
export type MoneyLine = { label: string; original: string; proposed: string }

export type ChangeSummaryProps = {
  values?: ChangedValue[]
  terms?: AffectedTerm[]
  money?: MoneyLine[]
}

// Original and proposed registration side by side (F35-2a): changed personal
// and contact values, the affected terms with their resulting participation,
// and the price of participation with the balance. Shared by the participant's
// review, the participant's request and the organizer's decision.
// Design only: every value is passed in, already formatted.
export function ChangeSummary({ values = [], terms = [], money = [] }: ChangeSummaryProps) {
  return (
    <div className="space-y-6">
      {values.length > 0 ? (
        <ComparisonTable
          heading="Údaje"
          firstColumn="Údaj"
        >
          {values.map((value) => (
            <StackedRow key={value.label}>
              <FirstCell>
                <span className="text-muted-foreground max-sm:font-medium max-sm:text-foreground">
                  {value.label}
                </span>
              </FirstCell>
              <SideCell side="Původně">
                <span className="block wrap-break-word whitespace-pre-line max-sm:text-right">
                  {value.original}
                </span>
              </SideCell>
              <SideCell side="Nově">
                <span className="block font-medium wrap-break-word whitespace-pre-line max-sm:text-right">
                  {value.proposed}
                </span>
              </SideCell>
            </StackedRow>
          ))}
        </ComparisonTable>
      ) : null}

      {terms.length > 0 ? (
        <ComparisonTable
          heading="Termíny"
          firstColumn="Termín"
        >
          {terms.map((term) => (
            <StackedRow key={term.id}>
              <FirstCell>
                <p className="font-medium">{term.label}</p>
                <p className="text-muted-foreground">
                  {term.dates} · <span className="font-mono">{term.price}</span>
                </p>
              </FirstCell>
              <SideCell side="Původně">
                <TermStateBadge state={term.original} />
              </SideCell>
              <SideCell side="Nově">
                <TermStateBadge state={term.proposed} />
              </SideCell>
            </StackedRow>
          ))}
        </ComparisonTable>
      ) : null}

      {money.length > 0 ? (
        <ComparisonTable
          heading="Cena a saldo"
          firstColumn="Položka"
          isNumeric
        >
          {money.map((line) => (
            <StackedRow key={line.label}>
              <FirstCell>
                <span className="text-muted-foreground max-sm:font-medium max-sm:text-foreground">
                  {line.label}
                </span>
              </FirstCell>
              <SideCell
                side="Původně"
                className="text-right"
              >
                <span className="font-mono">{line.original}</span>
              </SideCell>
              <SideCell
                side="Nově"
                className="text-right"
              >
                <span className="font-mono font-medium">{line.proposed}</span>
              </SideCell>
            </StackedRow>
          ))}
        </ComparisonTable>
      ) : null}
    </div>
  )
}

/**
 * A row of the comparison: a table row from the small breakpoint up; on a
 * narrow screen the first cell is a heading and each value is a labelled line
 * below it, so nothing scrolls sideways. The cells keep their own padding; the
 * negative margins in the wrappers line every line up at the same edge.
 */
function StackedRow({ children }: { children: ReactNode }) {
  return <TableRow className="max-sm:grid">{children}</TableRow>
}

/** The first cell of a stacked row: the term, the field or the amount's name. */
function FirstCell({ children }: { children: ReactNode }) {
  return (
    <TableCell className="max-sm:whitespace-normal">
      <div className="max-sm:-ml-4">{children}</div>
    </TableCell>
  )
}

/** One side ("Původně" or "Nově") of a row; the side's name shows only where the header is hidden. */
function SideCell({
  side,
  className,
  children,
}: {
  side: "Původně" | "Nově"
  className?: string
  children: ReactNode
}) {
  return (
    <TableCell className={cn("max-sm:whitespace-normal", className)}>
      <div
        className={cn(
          "max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:justify-between max-sm:gap-x-3 max-sm:gap-y-1 max-sm:py-1",
          side === "Původně" ? "max-sm:-mx-2" : "max-sm:-mr-4 max-sm:-ml-2",
        )}
      >
        <span className="text-muted-foreground sm:hidden">{side}</span>
        {children}
      </div>
    </TableCell>
  )
}

/** The term's participation on one side of the change; a dash where the term is not part of it. */
function TermStateBadge({ state }: { state: TermParticipation | null }) {
  if (state === null) return <span className="text-muted-foreground">–</span>
  return <ParticipationBadge status={state} />
}

type ComparisonTableProps = {
  heading: string
  firstColumn: string
  /** The compared columns hold amounts: header and values align to the right. */
  isNumeric?: boolean
  children: ReactNode
}

function ComparisonTable({ heading, firstColumn, isNumeric, children }: ComparisonTableProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{heading}</h3>
      <Table>
        {/* Narrow screens label each value in its row instead (StackedRow). */}
        <TableHeader className="max-sm:hidden">
          <TableRow>
            <TableHead>{firstColumn}</TableHead>
            <TableHead className={isNumeric ? "text-right" : undefined}>Původně</TableHead>
            <TableHead className={isNumeric ? "text-right" : undefined}>Nově</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </section>
  )
}
