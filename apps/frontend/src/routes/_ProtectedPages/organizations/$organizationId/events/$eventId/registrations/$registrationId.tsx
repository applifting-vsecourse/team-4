import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WorkspacePage } from "@/components/WorkspacePage"
import { HTTPError } from "@/lib/api-client"

import { evaluationKeys } from "@/features/accommodation/api/evaluationQueryOptions"
import { RegistrationDeterminationPanel } from "@/features/accommodation/components/RegistrationDeterminationPanel"
import { RegistrationEvaluationHistory } from "@/features/accommodation/components/RegistrationEvaluationHistory"
import { RegistrationTermDecisions } from "@/features/accommodation/components/RegistrationTermDecisions"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import {
  eventRegistrationKeys,
  eventRegistrationQueryOptions,
} from "@/features/registrations/api/eventRegistrationQueryOptions"
import { OrganizerAccommodationCard } from "@/features/registrations/components/OrganizerAccommodationCard"
import { OrganizerNeedsSection } from "@/features/registrations/components/OrganizerNeedsSection"
import { RecordPaymentDialog } from "@/features/registrations/components/RecordPaymentDialog"
import { RegistrationChangeDecision } from "@/features/registrations/components/RegistrationChangeDecision"
import { RegistrationDetail } from "@/features/registrations/components/RegistrationDetail"

// Správa akce → Přihlášky → Detail účastníka (S2-11): the organizer's view of
// one registration, not the participant's account.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/registrations/$registrationId",
)({
  // Opened from Vyhodnocení (S3-01): the way back returns to the same term and queue.
  validateSearch: z.object({
    fromTerm: z.string().uuid().optional().catch(undefined),
    fromQueue: z.string().max(100).optional().catch(undefined),
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
      context.queryClient.ensureQueryData(
        eventRegistrationQueryOptions(params.organizationId, params.eventId, params.registrationId),
      ),
    ]),
  component: RegistrationPage,
  errorComponent: LoadError,
})

function RegistrationPage() {
  const { organizationId, eventId, registrationId } = Route.useParams()
  const { fromTerm, fromQueue } = Route.useSearch()
  const queryClient = useQueryClient()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const registration = useSuspenseQuery(
    eventRegistrationQueryOptions(organizationId, eventId, registrationId),
  )
  const name = `${registration.data.firstName} ${registration.data.lastName}`

  return (
    <WorkspacePage>
      <Seo title={`${name} – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            section={
              <Link
                to={ROUTES.eventRegistrations}
                params={{ organizationId, eventId }}
                search={
                  fromTerm ? { view: "evaluation", evaluationTerm: fromTerm, queue: fromQueue } : {}
                }
              >
                Přihlášky
              </Link>
            }
            current="Detail účastníka"
          />
        }
        title={name}
        description={event.name}
        actions={
          <RecordPaymentDialog
            organizationId={organizationId}
            eventId={eventId}
            registrationId={registrationId}
          />
        }
      />
      <div className="mb-6">
        <RegistrationChangeDecision
          organizationId={organizationId}
          eventId={eventId}
          registrationId={registrationId}
        />
      </div>
      <RegistrationDetail
        registration={registration.data}
        updatedAt={registration.dataUpdatedAt}
        isRefreshing={registration.isFetching}
        hasRefreshFailed={registration.isRefetchError}
        onRefresh={() => registration.refetch()}
        accommodation={
          <OrganizerAccommodationCard
            organizationId={organizationId}
            eventId={eventId}
            registration={registration.data}
            // The answer is an input of the evaluation: its proposals turn stale.
            onAnswerSaved={() =>
              void queryClient.invalidateQueries({
                queryKey: evaluationKeys.event(organizationId, eventId),
              })
            }
            determination={
              <RegistrationDeterminationPanel
                organizationId={organizationId}
                eventId={eventId}
                registrationId={registrationId}
                person={name}
                // The F64 notice follows the determination.
                invalidate={eventRegistrationKeys.detail(organizationId, eventId, registrationId)}
              />
            }
          />
        }
        terms={
          <RegistrationTermDecisions
            organizationId={organizationId}
            eventId={eventId}
            registrationId={registrationId}
            person={name}
            terms={registration.data.terms}
            invalidate={eventRegistrationKeys.detail(organizationId, eventId, registrationId)}
          />
        }
        history={
          <RegistrationEvaluationHistory
            organizationId={organizationId}
            eventId={eventId}
            registrationId={registrationId}
            person={name}
          />
        }
        needs={
          <OrganizerNeedsSection
            organizationId={organizationId}
            eventId={eventId}
            registration={registration.data}
            onReload={() => registration.refetch()}
          />
        }
      />
    </WorkspacePage>
  )
}

// A registration of another event or organization looks like a missing one
// (S2-03); any other failure can be retried and is never shown as data.
function LoadError({ error, reset }: ErrorComponentProps) {
  const { organizationId, eventId } = Route.useParams()
  const router = useRouter()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  const isGone = error instanceof HTTPError && [403, 404].includes(error.response.status)

  return (
    <WorkspacePage>
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization?.name}
          />
        }
        title="Přihláška"
      />
      {isGone ? (
        <RecordUnavailable
          action={
            <Button asChild>
              <Link
                to={ROUTES.organization}
                params={{ organizationId }}
              >
                Zpět na přehled akcí
              </Link>
            </Button>
          }
        />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset()
                  void router.invalidate()
                }}
              >
                Zkusit znovu
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
              >
                <Link
                  to={ROUTES.eventRegistrations}
                  params={{ organizationId, eventId }}
                >
                  Zpět na přihlášky
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </WorkspacePage>
  )
}
