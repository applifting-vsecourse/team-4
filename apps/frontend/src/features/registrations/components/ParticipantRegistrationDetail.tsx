import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronLeft, MapPin } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarDate, formatPragueDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { participantRegistrationQueryOptions } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { LoadFailedAlert } from "@/features/registrations/components/LoadFailedAlert"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { ParticipantTermList } from "@/features/registrations/components/ParticipantTermList"
import { RefreshButton } from "@/features/registrations/components/RefreshButton"
import {
  isRegistrationUnavailable,
  isSessionRefused,
} from "@/features/registrations/lib/sessionExpired"

const BackToList = () => (
  <Button
    variant="ghost"
    size="sm"
    asChild
  >
    <Link to={ROUTES.myRegistrations}>
      <ChevronLeft />
      Moje přihlášky
    </Link>
  </Button>
)

// One own registration (S2-14): terms, payment summary with the
// stored instructions, and the history of received payments.
type ParticipantRegistrationDetailProps = {
  registrationId: string
  /** What replaces the detail when the session has ended (S2-13). */
  sessionEnded: ReactNode
}

export function ParticipantRegistrationDetail({
  registrationId,
  sessionEnded,
}: ParticipantRegistrationDetailProps) {
  const query = useQuery(participantRegistrationQueryOptions(registrationId))
  const { data } = query

  if (query.isError && isSessionRefused(query.error)) return sessionEnded
  if (query.isError && isRegistrationUnavailable(query.error)) {
    return (
      <RecordUnavailable
        action={
          <Button
            variant="outline"
            asChild
          >
            <Link to={ROUTES.myRegistrations}>Zpět na moje přihlášky</Link>
          </Button>
        }
      />
    )
  }

  return (
    <section
      aria-busy={query.isFetching}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackToList />
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
        <>
          <div className="space-y-2">
            <h1 className="text-h2 wrap-break-word">{data.event.name}</h1>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              <span className="wrap-break-word">{data.event.location}</span>
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Termíny</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantTermList terms={data.terms} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platba</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantPaymentSummary
                selectedPriceMinor={data.selectedPriceMinor}
                amountDueMinor={data.amountDueMinor}
                paidMinor={data.paidMinor}
                balanceMinor={data.balanceMinor}
                instructions={data.paymentInstructions}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Přijaté platby</CardTitle>
            </CardHeader>
            <CardContent>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zatím nebyla zaznamenána žádná platba.
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {data.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"
                    >
                      <span className="text-muted-foreground">
                        {formatCalendarDate(payment.receivedOn)}
                      </span>
                      <span className="font-mono">{formatCzk(payment.amountMinor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {query.isError ? null : (
            <p className="text-sm text-muted-foreground">
              Aktualizováno {formatPragueDateTime(new Date(query.dataUpdatedAt).toISOString())}
            </p>
          )}
        </>
      ) : query.isPending ? (
        <div
          className="space-y-4"
          role="status"
          aria-label="Načítání přihlášky"
        >
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}
    </section>
  )
}
