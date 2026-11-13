import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { RefreshButton } from "@/components/RefreshButton"
import { Skeleton } from "@/components/ui/skeleton"

import { pendingChangesQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { ChangeRequestsTable } from "@/features/registrations/components/ChangeRequestsTable"
import {
  describeKinds,
  describeTerms,
  formatChangeTime,
} from "@/features/registrations/lib/changeSummary"

type ChangeRequestsSectionProps = { organizationId: string; eventId: string }

// Správa akce → Přihlášky → Ke schválení (F35-2a): the participants' change
// requests of this event, oldest first, each opening the registration detail
// where the organizer decides. A failed load is never shown as an empty queue.
export function ChangeRequestsSection({ organizationId, eventId }: ChangeRequestsSectionProps) {
  const query = useQuery(pendingChangesQueryOptions(organizationId, eventId))
  const { data } = query

  return (
    <section
      aria-labelledby="approvals-heading"
      aria-busy={query.isFetching}
      className="space-y-4"
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2
          id="approvals-heading"
          className="text-h4"
        >
          Ke schválení
        </h2>
        <RefreshButton
          isRefreshing={query.isFetching}
          onRefresh={() => query.refetch()}
        />
      </div>

      {query.isError ? (
        <LoadError
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <ChangeRequestsTable
          requests={data.map((change) => ({
            id: change.id,
            participant: `${change.participant.firstName} ${change.participant.lastName}`,
            email: change.participant.email,
            kind: describeKinds(change.kinds),
            terms: describeTerms(change),
            submittedAt: formatChangeTime(change.createdAt),
          }))}
          renderRowLink={(request, isPrimary) => {
            const change = data.find(({ id }) => id === request.id)
            return change ? (
              <Link
                to={ROUTES.registration}
                params={{ organizationId, eventId, registrationId: change.registrationId }}
                aria-label={isPrimary ? `Přihláška ${request.participant}` : undefined}
                aria-hidden={isPrimary ? undefined : true}
                tabIndex={isPrimary ? undefined : -1}
                className={
                  isPrimary
                    ? "block font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                    : "absolute inset-0"
                }
              >
                {isPrimary ? request.participant : null}
              </Link>
            ) : null
          }}
        />
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání žádostí"
          className="space-y-2"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </LoadingBlock>
      ) : null}
    </section>
  )
}
