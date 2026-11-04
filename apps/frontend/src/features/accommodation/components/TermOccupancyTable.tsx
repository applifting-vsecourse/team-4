import { RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { RetryAlert } from "@/features/accommodation/components/RetryAlert"
import { type TermCapacity } from "@/features/accommodation/components/TermCapacitySummary"
import { STATUS_BADGE, type EvaluationStatus } from "@/features/accommodation/lib/proposal"

export type OccupancyTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
  status: EvaluationStatus
  capacity: TermCapacity
}

export type TermOccupancyTableProps = {
  terms: OccupancyTerm[]
  /** Already formatted, e.g. "dnes 14:35". */
  updatedAt: string
  /** The load failed: an error with a retry, never zeros. */
  isLoadFailed?: boolean
}

// Správa akce → Ubytování → Obsazenost (F17-1): the S2-10 table of terms with
// pending participants and the proposal added; beds and extra beds per room
// stay in the F11-1 "Pokoje" section below. Design only: every value is
// passed in.
export function TermOccupancyTable({
  terms,
  updatedAt,
  isLoadFailed = false,
}: TermOccupancyTableProps) {
  return (
    <section
      aria-labelledby="occupancy-heading"
      className="space-y-4"
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2
          id="occupancy-heading"
          className="text-h4"
        >
          Obsazenost po termínech
        </h2>
        <Button variant="outline">
          <RefreshCw />
          Aktualizovat
        </Button>
      </div>

      {isLoadFailed ? (
        <RetryAlert title="Obsazenost se nepodařilo načíst" />
      ) : (
        <>
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termín</TableHead>
                  <TableHead className="text-right">Kapacita</TableHead>
                  <TableHead className="text-right">Potvrzení</TableHead>
                  <TableHead className="text-right">Čekají</TableHead>
                  <TableHead className="text-right">Náhradníci</TableHead>
                  <TableHead className="text-right">Vhodní</TableHead>
                  <TableHead>Návrh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => {
                  const { capacity } = term
                  return (
                    <TableRow key={term.id}>
                      <TableCell>
                        <p>{term.label}</p>
                        <p className="text-muted-foreground">{term.dates}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {capacity.hasRooms ? (
                          <>
                            <p>{capacity.baseBeds + capacity.extraBeds}</p>
                            <p className="text-muted-foreground">
                              {capacity.baseBeds} + {capacity.extraBeds} přistýlky
                            </p>
                          </>
                        ) : (
                          "Neevidována"
                        )}
                      </TableCell>
                      <TableCell className="text-right">{capacity.confirmed}</TableCell>
                      <TableCell className="text-right">{capacity.pending}</TableCell>
                      <TableCell className="text-right">{capacity.waitlisted}</TableCell>
                      <TableCell className="text-right">
                        {capacity.proposal?.suitable ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[term.status].variant}>
                          {STATUS_BADGE[term.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
          <p className="text-sm text-muted-foreground">Aktualizováno {updatedAt}</p>
        </>
      )}
    </section>
  )
}
