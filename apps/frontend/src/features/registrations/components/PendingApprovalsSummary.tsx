import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { pendingChangesQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { describeKinds, formatChangeTime } from "@/features/registrations/lib/changeSummary"

type PendingApprovalsSummaryProps = { organizationId: string; eventId: string }

// The organizer's most immediate task on an event: participant changes waiting
// for a decision. The queue is also shown in full under Přihlášky → Ke schválení.
export function PendingApprovalsSummary({ organizationId, eventId }: PendingApprovalsSummaryProps) {
  const query = useQuery(pendingChangesQueryOptions(organizationId, eventId))
  const count = query.data?.length ?? 0
  const oldest = query.data?.[0]
  const pendingLabel = count === 1 ? "žádost čeká" : count < 5 ? "žádosti čekají" : "žádostí čeká"

  return (
    <section
      aria-labelledby="pending-approvals-heading"
      aria-busy={query.isFetching}
      className="space-y-4"
    >
      <h2
        id="pending-approvals-heading"
        className="text-h4"
      >
        Vyžaduje vaši pozornost
      </h2>

      {query.isError ? (
        <LoadError
          title="Čekající žádosti se nepodařilo načíst"
          shownFrom={query.data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {query.data ? (
        !oldest ? (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Žádné žádosti nečekají na vaše rozhodnutí.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>
                  {count} {pendingLabel} na rozhodnutí
                </CardTitle>
                <Badge variant="warning">{count}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    Nejstarší: {oldest.participant.firstName} {oldest.participant.lastName}
                  </p>
                  <p className="text-muted-foreground">
                    {describeKinds(oldest.kinds)} · podáno {formatChangeTime(oldest.createdAt)}
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full sm:w-auto"
                >
                  <Link
                    to={ROUTES.eventRegistrations}
                    params={{ organizationId, eventId }}
                    search={{ view: "approvals" }}
                  >
                    Vyřídit žádosti
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání čekajících žádostí"
          className="space-y-2"
        >
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
        </LoadingBlock>
      ) : null}
    </section>
  )
}
