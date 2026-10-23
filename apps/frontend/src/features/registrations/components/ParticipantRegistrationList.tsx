import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPragueDateTime } from "@/lib/date"

import { participantRegistrationsQueryOptions } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import { LoadFailedAlert } from "@/features/registrations/components/LoadFailedAlert"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { ParticipantTermList } from "@/features/registrations/components/ParticipantTermList"
import { RefreshButton } from "@/features/registrations/components/RefreshButton"
import { isSessionRefused } from "@/features/registrations/lib/sessionExpired"

// "Moje přihlášky" (S2-14, Wireframy M2): every registration of the verified
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
  const query = useQuery(participantRegistrationsQueryOptions())
  const { data } = query

  if (query.isError && isSessionRefused(query.error)) return sessionEnded

  return (
    <section
      aria-busy={query.isFetching}
      className="space-y-4"
    >
      <p className="text-sm wrap-break-word text-muted-foreground">{email}</p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2">Moje přihlášky</h1>
        <RefreshButton
          isRefreshing={query.isFetching}
          onRefresh={() => query.refetch()}
        />
      </div>

      {query.isError ? (
        <LoadFailedAlert
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Zatím nemáte žádné přihlášky.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-4">
            {data.map((registration) => (
              <li key={registration.id}>
                <RegistrationCard registration={registration} />
              </li>
            ))}
          </ul>
        )
      ) : query.isPending ? (
        <div
          className="space-y-4"
          role="status"
          aria-label="Načítání přihlášek"
        >
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
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
              paidMinor={registration.paidMinor}
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
