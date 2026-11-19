import { useState } from "react"
import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronDown, ClipboardList } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { EmptyState } from "@/components/EmptyState"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageHeader } from "@/components/PageHeader"
import { RefreshButton } from "@/components/RefreshButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPragueDateTime, todayInPrague } from "@/lib/date"

import { participantRegistrationsQueryOptions } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { ParticipantTermList } from "@/features/registrations/components/ParticipantTermList"
import { isSessionRefused } from "@/features/registrations/lib/sessionExpired"

// "Moje přihlášky" (S2-14): every registration of the verified
// participant, with the status of each term and the payment summary. A failed
// refresh keeps the last data and says so; a failed first load is never shown
// as "no registrations".
type ParticipantRegistrationListProps = {
  email: string
  /** What replaces the list when the session has ended (S2-13). */
  sessionEnded: ReactNode
}

export function ParticipantRegistrationList({
  email,
  sessionEnded,
}: ParticipantRegistrationListProps) {
  const [isPastEventsOpen, setIsPastEventsOpen] = useState(false)
  const query = useQuery(participantRegistrationsQueryOptions())
  const { data } = query

  if (query.isError && isSessionRefused(query.error)) return sessionEnded

  const today = todayInPrague()
  const currentRegistrations = data?.filter(
    (registration) =>
      registration.terms.length === 0 || registration.terms.some((term) => term.endDate >= today),
  )
  const pastRegistrations = data?.filter(
    (registration) =>
      registration.terms.length > 0 && registration.terms.every((term) => term.endDate < today),
  )

  return (
    <section
      aria-busy={query.isFetching}
      className="space-y-4"
    >
      <BackLink to={ROUTES.catalog}>Katalog akcí</BackLink>
      <PageHeader
        title="Moje přihlášky"
        description={<p className="wrap-break-word">{email}</p>}
        actions={
          <RefreshButton
            isRefreshing={query.isFetching}
            onRefresh={() => query.refetch()}
          />
        }
      />

      {query.isError ? (
        <LoadError
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Zatím nemáte žádné přihlášky"
          />
        ) : (
          <>
            {currentRegistrations?.length ? (
              <ul className="space-y-4">
                {currentRegistrations.map((registration) => (
                  <li key={registration.id}>
                    <RegistrationCard registration={registration} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nemáte žádné aktuální přihlášky.</p>
            )}

            {pastRegistrations?.length ? (
              <Collapsible
                open={isPastEventsOpen}
                onOpenChange={setIsPastEventsOpen}
              >
                <section aria-labelledby="past-registrations-heading">
                  <h2 id="past-registrations-heading">
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="group w-full justify-between"
                      >
                        <span>Proběhlé akce ({pastRegistrations.length})</span>
                        <ChevronDown
                          aria-hidden
                          className="transition-transform group-data-[state=open]:rotate-180"
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </h2>
                  <CollapsibleContent>
                    <ul className="space-y-4 pt-4">
                      {pastRegistrations.map((registration) => (
                        <li key={registration.id}>
                          <RegistrationCard registration={registration} />
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </section>
              </Collapsible>
            ) : null}
          </>
        )
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání přihlášek"
          className="space-y-4"
        >
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </LoadingBlock>
      ) : null}

      {data && !query.isError ? (
        <p className="text-sm text-muted-foreground">
          Aktualizováno {formatPragueDateTime(new Date(query.dataUpdatedAt).toISOString())}
        </p>
      ) : null}
    </section>
  )
}

function RegistrationCard({ registration }: { registration: ParticipantRegistration }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>
            <h2 className="text-h4 wrap-break-word">{registration.event.name}</h2>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link
              to={ROUTES.myRegistration}
              params={{ registrationId: registration.id }}
              aria-label={`Detail přihlášky ${registration.event.name}`}
            >
              Detail
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ParticipantTermList terms={registration.terms} />
          <div className="border-t border-border pt-4">
            <ParticipantPaymentSummary
              selectedPriceMinor={registration.selectedPriceMinor}
              amountDueMinor={registration.amountDueMinor}
              balanceMinor={registration.balanceMinor}
              instructions={registration.paymentInstructions}
              shouldShowAccount={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
