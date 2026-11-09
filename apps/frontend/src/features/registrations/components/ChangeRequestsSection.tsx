import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Loader2, RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw />}
          {query.isFetching ? "Aktualizuji…" : "Aktualizovat"}
        </Button>
      </div>

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
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
        <div
          className="space-y-2"
          aria-label="Načítání žádostí"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}
    </section>
  )
}
