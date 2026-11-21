import { useEffect, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useRouterState } from "@tanstack/react-router"
import { ChevronDown, MapPin } from "lucide-react"

import { ROUTES, SECTIONS } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { RefreshButton } from "@/components/RefreshButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarDate, formatCalendarRange, formatPragueDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  participantChangesQueryOptions,
  participantRegistrationQueryOptions,
} from "@/features/registrations/api/participantRegistrationQueryOptions"
import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import { type ChangeProposal } from "@/features/registrations/api/registrationChangeSchemas"
import { AccommodationCard } from "@/features/registrations/components/AccommodationCard"
import { ChangeRequestCard } from "@/features/registrations/components/ChangeRequestCard"
import { ChangeReviewDialog } from "@/features/registrations/components/ChangeReviewDialog"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { PaymentQrCard } from "@/features/registrations/components/PaymentQrCard"
import { RegistrationChangeActions } from "@/features/registrations/components/RegistrationChangeActions"
import { RegistrationHistory } from "@/features/registrations/components/RegistrationHistory"
import { RegistrationNeedsSummary } from "@/features/registrations/components/RegistrationNeedsSummary"
import { RegistrationTermStates } from "@/features/registrations/components/RegistrationTermStates"
import { SimulatedPaymentHistory } from "@/features/registrations/components/SimulatedPaymentHistory"
import {
  describeHistoryEntry,
  describeKinds,
  formatChangeTime,
  toSummaryProps,
} from "@/features/registrations/lib/changeSummary"
import { paymentLinkUrl } from "@/features/registrations/lib/paymentLink"
import {
  isRegistrationUnavailable,
  isSessionRefused,
} from "@/features/registrations/lib/sessionExpired"

const BackToList = () => <BackLink to={ROUTES.myRegistrations}>Moje přihlášky</BackLink>

// One own registration (S2-14): terms, payment summary with the
// stored instructions, and the history of received payments.
type ParticipantRegistrationDetailProps = {
  registrationId: string
  /** What replaces the detail when the session has ended (S2-13). */
  sessionEnded: ReactNode
  /** The programme of the confirmed terms (F65), owned by another feature. */
  renderProgramme?: (registration: ParticipantRegistration) => ReactNode
  /** The own rooms of the confirmed terms (S4-02), owned by another feature. */
  renderRooms?: (registration: ParticipantRegistration) => ReactNode
}

export function ParticipantRegistrationDetail({
  registrationId,
  sessionEnded,
  renderProgramme,
  renderRooms,
}: ParticipantRegistrationDetailProps) {
  const query = useQuery(participantRegistrationQueryOptions(registrationId))
  const changesQuery = useQuery(participantChangesQueryOptions(registrationId))
  const [cancelProposal, setCancelProposal] = useState<ChangeProposal | null>(null)
  const { data } = query
  const hash = useRouterState({ select: (state) => state.location.hash })
  const isLoaded = data !== undefined
  // A link to a section (an Oznámení of a payment, S4-06) lands on it once the
  // detail has loaded; the router scrolled before the section existed.
  useEffect(() => {
    if (isLoaded && hash) document.getElementById(hash)?.scrollIntoView()
  }, [isLoaded, hash])
  const changes = changesQuery.data ?? []
  const pendingRequest = changes.find((change) => change.status === "pending")
  const resolvedRequests = changes.filter(
    (change) => change.status === "approved" || change.status === "rejected",
  )

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
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton
            isRefreshing={query.isFetching || changesQuery.isFetching}
            onRefresh={() => {
              void query.refetch()
              void changesQuery.refetch()
            }}
          />
        </div>
      </div>

      {query.isError ? (
        <LoadError
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <>
          <PageHeader
            title={data.event.name}
            badge={data.isCancelled ? <Badge variant="secondary">Odhlášená přihláška</Badge> : null}
            description={
              <p className="flex items-start gap-2">
                <MapPin
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="wrap-break-word">{data.event.location}</span>
              </p>
            }
          />

          {data.canChange ? (
            <section
              aria-label="Akce s přihláškou"
              className="-mt-2"
            >
              <RegistrationChangeActions
                registrationId={registrationId}
                onCancelRegistration={() =>
                  setCancelProposal({
                    moves: [],
                    cancelledTermIds: data.terms
                      .filter((term) => term.status !== "cancelled")
                      .map((term) => term.termId),
                  })
                }
              />
            </section>
          ) : null}

          {changesQuery.isError ? (
            <LoadError
              title="Změny přihlášky se nepodařilo načíst"
              isRetrying={changesQuery.isFetching}
              onRetry={() => changesQuery.refetch()}
            />
          ) : null}

          {pendingRequest ? (
            <ChangeRequestCard
              status="pending"
              kind={describeKinds(pendingRequest.kinds)}
              submittedAt={formatChangeTime(pendingRequest.createdAt)}
              summary={toSummaryProps(pendingRequest.summary)}
            />
          ) : null}

          {resolvedRequests.length > 0 ? (
            <Collapsible>
              <section aria-labelledby="change-requests-heading">
                <h2 id="change-requests-heading">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="group w-full justify-between"
                    >
                      <span>Žádosti o změnu ({resolvedRequests.length})</span>
                      <ChevronDown
                        aria-hidden
                        className="transition-transform group-data-[state=open]:rotate-180"
                      />
                    </Button>
                  </CollapsibleTrigger>
                </h2>
                <CollapsibleContent>
                  <ul className="space-y-4 pt-4">
                    {resolvedRequests.map((request) => (
                      <li key={request.id}>
                        <ChangeRequestCard
                          status={request.status === "approved" ? "approved" : "rejected"}
                          kind={describeKinds(request.kinds)}
                          submittedAt={formatChangeTime(request.createdAt)}
                          decidedAt={
                            request.decidedAt ? formatChangeTime(request.decidedAt) : undefined
                          }
                          summary={toSummaryProps(request.summary)}
                        />
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </section>
            </Collapsible>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Termíny</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationTermStates
                terms={data.terms.map((term) => ({
                  id: term.termId,
                  label: term.label,
                  details: `${formatCalendarRange(term.startDate, term.endDate)} · ${formatCzk(term.priceMinor)}`,
                  state: term.status,
                }))}
              />
            </CardContent>
          </Card>

          <RegistrationNeedsSummary values={data.needs} />
          <AccommodationCard answer={data.contact} />
          {renderRooms?.(data)}

          {renderProgramme?.(data)}

          <Card>
            <CardHeader>
              <CardTitle>Platba</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantPaymentSummary
                selectedPriceMinor={data.selectedPriceMinor}
                amountDueMinor={data.amountDueMinor}
                balanceMinor={data.balanceMinor}
                instructions={data.paymentInstructions}
              />
              {data.paymentLinkToken ? (
                <PaymentQrCard link={paymentLinkUrl(data.paymentLinkToken)} />
              ) : null}
            </CardContent>
          </Card>

          <Card
            id={SECTIONS.receivedPayments}
            className="scroll-mt-20"
          >
            <CardHeader>
              <CardTitle>Přijaté platby</CardTitle>
            </CardHeader>
            <CardContent>
              <SimulatedPaymentHistory
                payments={data.payments.map((payment) => ({
                  id: payment.id,
                  date: formatCalendarDate(payment.receivedOn),
                  amount: formatCzk(payment.amountMinor),
                  isSimulated: payment.source === "qr_link",
                }))}
              />
            </CardContent>
          </Card>

          {changes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Historie změn</CardTitle>
              </CardHeader>
              <CardContent>
                <RegistrationHistory
                  entries={changes.map((change) => ({
                    id: change.id,
                    at: formatChangeTime(change.decidedAt ?? change.createdAt),
                    text: describeHistoryEntry(change),
                  }))}
                />
              </CardContent>
            </Card>
          ) : null}

          {cancelProposal ? (
            <ChangeReviewDialog
              registrationId={registrationId}
              proposal={cancelProposal}
              onClose={() => setCancelProposal(null)}
              onDone={() => setCancelProposal(null)}
              onReload={() => {
                setCancelProposal(null)
                void query.refetch()
                void changesQuery.refetch()
              }}
            />
          ) : null}

          {query.isError ? null : (
            <p className="text-sm text-muted-foreground">
              Aktualizováno {formatPragueDateTime(new Date(query.dataUpdatedAt).toISOString())}
            </p>
          )}
        </>
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání přihlášky"
          className="space-y-4"
        >
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </LoadingBlock>
      ) : null}
    </section>
  )
}
