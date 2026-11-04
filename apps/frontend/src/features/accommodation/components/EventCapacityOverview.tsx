import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { RetryAlert } from "@/features/accommodation/components/RetryAlert"
import {
  TermCapacitySummary,
  type TermCapacity,
} from "@/features/accommodation/components/TermCapacitySummary"
import { STATUS_BADGE, type EvaluationStatus } from "@/features/accommodation/lib/proposal"

export type OverviewTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
  status: EvaluationStatus
  /** When the shown proposal was evaluated, e.g. "dnes 14:32". */
  evaluatedAt?: string
  capacity: TermCapacity
}

export type EventCapacityOverviewProps = {
  terms: OverviewTerm[]
  /** The overview could not be loaded: an error with a retry, never zeros. */
  isLoadFailed?: boolean
}

// Správa akce → Přehled → Kapacita po termínech (F17-1): every term on its
// own, with participation, capacity and the counts of its proposal; the
// terms are never merged into one state. Design only: every value is passed in.
export function EventCapacityOverview({ terms, isLoadFailed = false }: EventCapacityOverviewProps) {
  return (
    <section
      aria-labelledby="capacity-overview-heading"
      className="space-y-4"
    >
      <h2
        id="capacity-overview-heading"
        className="text-h4"
      >
        Kapacita po termínech
      </h2>

      {isLoadFailed ? (
        <RetryAlert title="Kapacitu termínů se nepodařilo načíst" />
      ) : (
        terms.map((term) => (
          <Card key={term.id}>
            <CardHeader>
              <CardTitle>
                <h3 className="flex flex-wrap items-center gap-2">
                  {term.label}
                  <Badge variant={STATUS_BADGE[term.status].variant}>
                    {STATUS_BADGE[term.status].label}
                  </Badge>
                </h3>
              </CardTitle>
              <CardDescription>
                {term.dates}
                {term.evaluatedAt ? ` · návrh z ${term.evaluatedAt}` : ""}
              </CardDescription>
              <CardAction>
                <Button
                  variant="outline"
                  aria-label={`Otevřít vyhodnocení: ${term.label}`}
                >
                  Vyhodnocení
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TermCapacitySummary term={term.capacity} />
            </CardContent>
          </Card>
        ))
      )}
    </section>
  )
}
