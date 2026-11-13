import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { Notice } from "@/components/Notice"
import { RefreshButton } from "@/components/RefreshButton"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"

import { type TermOccupancy } from "@/features/rooms/api/roomSchemas"

type OccupancySectionProps = {
  organizationId: string
  eventId: string
  terms: TermOccupancy[]
  /** When the shown counts were read from the server (ms since epoch). */
  updatedAt: number
  isRefreshing: boolean
  /** The last refresh failed; `terms` are still from the one before. */
  hasRefreshFailed: boolean
  onRefresh: () => unknown
}

// Capacity, confirmed, free beds and waiting participants of each term
// (S2-10). The counts are read on demand only: "Aktualizovat"
// reloads them, and a failed reload keeps the last good ones, labelled as such.
export function OccupancySection({
  organizationId,
  eventId,
  terms,
  updatedAt,
  isRefreshing,
  hasRefreshFailed,
  onRefresh,
}: OccupancySectionProps) {
  const withoutBeds = terms.filter((term) => term.capacity === 0).map((term) => term.label)
  const updated = formatPragueDateTime(new Date(updatedAt).toISOString())

  return (
    <section
      aria-labelledby="occupancy-heading"
      aria-busy={isRefreshing}
    >
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2
          id="occupancy-heading"
          className="text-h4"
        >
          Obsazenost po termínech
        </h2>
        {terms.length > 0 ? (
          <RefreshButton
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        ) : null}
      </div>

      {terms.length === 0 ? (
        <Notice
          tone="info"
          title="Akce zatím nemá žádné termíny, pokoje tedy nemají kde být dostupné."
        >
          <Link
            to={ROUTES.eventSettings}
            hash="terms-heading"
            params={{ organizationId, eventId }}
            className="text-foreground underline"
          >
            Přidat termín
          </Link>
        </Notice>
      ) : (
        <div className="space-y-3">
          {hasRefreshFailed ? (
            <LoadError
              title="Aktualizace se nezdařila"
              shownFrom={updatedAt}
              isRetrying={isRefreshing}
              onRetry={onRefresh}
            />
          ) : null}

          <Card>
            <div className="-my-6">
              <Table containerLabel="Tabulka obsazenosti po termínech">
                <TableHeader>
                  <TableRow>
                    <TableHead>Termín</TableHead>
                    <TableHead className="text-right">Kapacita</TableHead>
                    <TableHead className="text-right">Potvrzení</TableHead>
                    <TableHead className="text-right">Volná lůžka</TableHead>
                    <TableHead className="text-right">Náhradníci</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell>
                        <p className="font-medium">{term.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCalendarRange(term.startDate, term.endDate)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">{term.capacity}</TableCell>
                      <TableCell className="text-right">{term.confirmed}</TableCell>
                      <TableCell className="text-right">{term.free}</TableCell>
                      <TableCell className="text-right">{term.waitlisted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="space-y-1 text-sm text-muted-foreground">
            {withoutBeds.length > 0 ? (
              <p>
                {withoutBeds.join(", ")} {withoutBeds.length === 1 ? "nemá" : "nemají"} dostupná
                lůžka. Náhradníci kapacitu nespotřebovávají.
              </p>
            ) : null}
            {hasRefreshFailed ? null : <p>Aktualizováno {updated}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
