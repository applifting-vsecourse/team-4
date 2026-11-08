import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { WorkspacePage } from "@/components/WorkspacePage"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLoadError } from "@/features/events/components/EventLoadError"
import { EventNavigation } from "@/features/events/components/EventNavigation"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { MissingTermNotice } from "@/features/events/components/MissingTermNotice"
import { TermDialog } from "@/features/events/components/TermDialog"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { EventOverviewSummary } from "@/features/registrations/components/EventOverviewSummary"

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
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))

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
        actions={
          !event.isLocked && event.terms.length > 0 ? (
            <TermDialog
              organizationId={organizationId}
              eventId={eventId}
              trigger={
                <Button variant="outline">
                  <Plus />
                  Přidat termín
                </Button>
              }
            />
          ) : null
        }
      />
      <div className="space-y-8">
        <MissingTermNotice
          organizationId={organizationId}
          event={event}
        />
        {event.terms.length > 0 ? (
          <EventOverviewSummary
            organizationId={organizationId}
            eventId={eventId}
            terms={event.terms}
          />
        ) : null}
        <EventNavigation
          organizationId={organizationId}
          eventId={eventId}
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
