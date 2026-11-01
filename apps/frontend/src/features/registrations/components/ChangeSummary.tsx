import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ParticipationBadge } from "@/features/registrations/components/ParticipationBadge"

/** A term's participation before or after the change; "cancelled" once released. */
export type TermState = "confirmed" | "waitlisted" | "cancelled"

/** A personal or contact value the change replaces. */
export type ChangedValue = { label: string; original: string; proposed: string }

/** A term the change touches; null on the side where the term is not part of the registration. */
export type AffectedTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "20. 11. – 22. 11. 2026". */
  dates: string
  /** Already formatted, e.g. "2 400 Kč". */
  price: string
  original: TermState | null
  proposed: TermState | null
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
            <TableRow key={value.label}>
              <TableCell>
                <span className="text-muted-foreground">{value.label}</span>
              </TableCell>
              <TableCell>{value.original}</TableCell>
              <TableCell>
                <span className="font-medium">{value.proposed}</span>
              </TableCell>
            </TableRow>
          ))}
        </ComparisonTable>
      ) : null}

      {terms.length > 0 ? (
        <ComparisonTable
          heading="Termíny"
          firstColumn="Termín"
        >
          {terms.map((term) => (
            <TableRow key={term.id}>
              <TableCell>
                <p className="font-medium">{term.label}</p>
                <p className="text-muted-foreground">
                  {term.dates} · <span className="font-mono">{term.price}</span>
                </p>
              </TableCell>
              <TableCell>
                <TermStateBadge state={term.original} />
              </TableCell>
              <TableCell>
                <TermStateBadge state={term.proposed} />
              </TableCell>
            </TableRow>
          ))}
        </ComparisonTable>
      ) : null}

      {money.length > 0 ? (
        <ComparisonTable
          heading="Cena a saldo"
          firstColumn="Položka"
        >
          {money.map((line) => (
            <TableRow key={line.label}>
              <TableCell>
                <span className="text-muted-foreground">{line.label}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono">{line.original}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono font-medium">{line.proposed}</span>
              </TableCell>
            </TableRow>
          ))}
        </ComparisonTable>
      ) : null}
    </div>
  )
}

/** Participation of one term, including a released one. */
export function TermStateBadge({ state }: { state: TermState | null }) {
  if (state === null) return <span className="text-muted-foreground">–</span>
  if (state === "cancelled") return <Badge variant="secondary">Odhlášeno</Badge>
  return <ParticipationBadge status={state} />
}

type ComparisonTableProps = { heading: string; firstColumn: string; children: ReactNode }

function ComparisonTable({ heading, firstColumn, children }: ComparisonTableProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{heading}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{firstColumn}</TableHead>
            <TableHead>Původně</TableHead>
            <TableHead>Nově</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </section>
  )
}
