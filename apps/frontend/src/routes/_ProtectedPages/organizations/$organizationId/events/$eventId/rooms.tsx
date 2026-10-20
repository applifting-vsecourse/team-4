import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { roomsQueryOptions } from "@/features/rooms/api/roomQueryOptions"
import { RoomsSection } from "@/features/rooms/components/RoomsSection"

// Správa akce → Ubytování → Pokoje (S2-05).
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/rooms",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
      context.queryClient.ensureQueryData(roomsQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: RoomsPage,
  errorComponent: Unavailable,
})

function RoomsPage() {
  const { organizationId, eventId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const { data: overview } = useSuspenseQuery(roomsQueryOptions(organizationId, eventId))
  // The term capacities on the event page are derived from these rooms.
  const refreshEvent = useRefreshEvent(organizationId, eventId)

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <Seo title={`Pokoje – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Ubytování / Pokoje"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
      />
      <RoomsSection
        organizationId={organizationId}
        eventId={eventId}
        overview={overview}
        onChanged={refreshEvent}
      />
    </section>
  )
}

// A foreign and a missing event look the same (S2-03, Wireframy N1).
function Unavailable() {
  const { organizationId } = Route.useParams()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization?.name}
          />
        }
        title="Pokoje a lůžka"
      />
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
    </section>
  )
}
