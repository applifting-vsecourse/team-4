import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBeds } from "@/lib/beds"
import { formatCzk } from "@/lib/money"

import { eventRegistrationsQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { summarizeEvent, type OverviewTerm } from "@/features/registrations/lib/overviewSummary"

type EventOverviewSummaryProps = {
  organizationId: string
  eventId: string
  terms: OverviewTerm[]
}

const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.min(100, Math.round((part / whole) * 100))

// Registrations, occupancy and payments of one event. While loading or after a
// failure it never shows the missing values as zeros.
export function EventOverviewSummary({
  organizationId,
  eventId,
  terms,
}: EventOverviewSummaryProps) {
  const query = useQuery(eventRegistrationsQueryOptions(organizationId, eventId, {}))

  if (query.isError && !query.data) {
    return (
      <LoadError
        title="Souhrn se nepodařilo načíst"
        description="Počty přihlášek, obsazenost a platby teď nejsou k dispozici."
        isRetrying={query.isFetching}
        onRetry={() => query.refetch()}
      />
    )
  }

  if (!query.data) {
    return (
      <LoadingBlock
        label="Načítání souhrnu"
        className="grid gap-4 md:grid-cols-3"
      >
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </LoadingBlock>
    )
  }

  const summary = summarizeEvent(query.data.registrations, terms)
  const params = { organizationId, eventId }

  return (
    <section
      aria-labelledby="overview-summary-heading"
      className="space-y-4"
    >
      <h2
        id="overview-summary-heading"
        className="text-h4"
      >
        Souhrn akce
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Přihlášky</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-h2">{summary.registrationCount}</p>
              <p className="text-muted-foreground">
                Počet přihlášených osob. Náhradníků na termínech: {summary.waitlistedTotal}.
              </p>
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link
                to={ROUTES.eventRegistrations}
                params={params}
              >
                Zobrazit přihlášky
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Obsazenost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-h2">
                {summary.confirmedTotal} / {summary.capacityTotal}
              </p>
              <p className="text-muted-foreground">Potvrzená místa z celkové kapacity termínů.</p>
              <ul className="space-y-2">
                {summary.terms.map(({ term, confirmed }) => (
                  <li
                    key={term.id}
                    className="space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{term.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {confirmed} z {formatBeds(term.capacity)}
                      </span>
                    </div>
                    <Progress
                      value={percent(confirmed, term.capacity)}
                      aria-label={`Obsazenost termínu ${term.label}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link
                to={ROUTES.eventRooms}
                params={params}
              >
                Zobrazit ubytování
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platby</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-h2">{formatCzk(summary.paidMinor)}</p>
              <p className="text-muted-foreground">
                Přijato z {formatCzk(summary.amountDueMinor)} k úhradě.
              </p>
              <dl className="space-y-1">
                <div className="flex justify-between gap-2">
                  <dt>Zaplaceno</dt>
                  <dd>{summary.paidCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Částečně zaplaceno</dt>
                  <dd>{summary.partialCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Nezaplaceno</dt>
                  <dd>{summary.unpaidCount}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link
                to={ROUTES.eventRegistrations}
                params={params}
                search={{ payment: "unpaid" }}
              >
                Zobrazit nezaplacené
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
