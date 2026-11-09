import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { Seo } from "@/components/Seo"
import { WorkspacePage } from "@/components/WorkspacePage"

import { evaluationModeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLoadError } from "@/features/events/components/EventLoadError"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { EventTips } from "@/features/events/components/EventTips"
import { MissingTermNotice } from "@/features/events/components/MissingTermNotice"
import { OpeningReadiness } from "@/features/events/components/OpeningReadiness"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { EventOverviewSummary } from "@/features/registrations/components/EventOverviewSummary"
import { PendingApprovalsSummary } from "@/features/registrations/components/PendingApprovalsSummary"

// Management of one event: its details, terms (S2-04), rooms (S2-05) and payments (S2-09).
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: EventPage,
  errorComponent: Unavailable,
})

function EventPage() {
  const { organizationId, eventId } = Route.useParams()
  const navigate = Route.useNavigate()
  const showTerms = () => {
    void navigate({
      to: ROUTES.eventSettings,
      params: { organizationId, eventId },
      hash: "terms-heading",
    })
  }
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const canUseAutomaticEvaluation =
    event.status === "open" && event.terms.some((term) => term.capacity > 0)
  const evaluationMode = useQuery({
    ...evaluationModeQueryOptions(organizationId, eventId),
    enabled: canUseAutomaticEvaluation,
  })

  return (
    <WorkspacePage>
      <Seo title={event.name} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Přehled"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
      />
      <div className="space-y-8">
        <MissingTermNotice event={event} />
        {event.status === "draft" ? (
          <OpeningReadiness
            organizationId={organizationId}
            event={event}
            onTermAdded={showTerms}
          />
        ) : null}
        {event.status !== "draft" ? (
          <PendingApprovalsSummary
            organizationId={organizationId}
            eventId={eventId}
          />
        ) : null}
        {event.terms.length > 0 ? (
          <EventOverviewSummary
            organizationId={organizationId}
            eventId={eventId}
            terms={event.terms}
          />
        ) : null}
        <EventTips
          organizationId={organizationId}
          event={event}
          evaluationMode={canUseAutomaticEvaluation ? evaluationMode.data : undefined}
        />
      </div>
    </WorkspacePage>
  )
}

function Unavailable({ error, reset }: ErrorComponentProps) {
  const { organizationId } = Route.useParams()
  const router = useRouter()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  const { user } = useSession()
  return (
    <EventLoadError
      organizationId={organizationId}
      organizationName={organization?.name}
      error={error}
      onRetry={() => {
        reset()
        void router.invalidate()
      }}
      backAction={
        <BackToEventsButton
          organizationId={organizationId}
          userId={user?.id}
        />
      }
    />
  )
}
