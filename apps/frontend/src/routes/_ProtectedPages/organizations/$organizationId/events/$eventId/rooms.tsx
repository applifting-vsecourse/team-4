import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { WorkspacePage } from "@/components/WorkspacePage"

import { hardAttributeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { ROOM_PROPOSAL_SETTINGS_HEADING } from "@/features/accommodation/components/RoomProposalPreferencesSection"
import { RoomProposalSection } from "@/features/accommodation/components/RoomProposalSection"
import { attributeLabel } from "@/features/accommodation/lib/evaluationView"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventSettingsButton } from "@/features/events/components/EventSettingsButton"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { roomsQueryOptions } from "@/features/rooms/api/roomQueryOptions"
import { OccupancySection } from "@/features/rooms/components/OccupancySection"
import { RoomsSection } from "@/features/rooms/components/RoomsSection"

// Správa akce → Ubytování: occupancy of the terms (S2-10), the room proposal
// of the selected term (#385) and rooms (S2-05). The term is in the URL, so a
// refresh and the way back keep it.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/rooms",
)({
  // The term of the room proposal; the first term otherwise.
  validateSearch: z.object({ term: z.string().uuid().optional().catch(undefined) }),
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
  const rooms = useSuspenseQuery(roomsQueryOptions(organizationId, eventId))
  const { term } = Route.useSearch()
  const navigate = Route.useNavigate()
  // The reason H names the hard attribute; without one it never applies.
  const { data: rules } = useQuery(hardAttributeQueryOptions(organizationId, eventId))
  const termId = event.terms.find((t) => t.id === term)?.id ?? event.terms[0]?.id ?? ""
  // The term capacities on the event page are derived from these rooms.
  const refreshEvent = useRefreshEvent(organizationId, eventId)

  return (
    <WorkspacePage>
      <Seo title={`Ubytování – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Ubytování"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
        actions={
          <EventSettingsButton
            organizationId={organizationId}
            eventId={eventId}
            section={ROOM_PROPOSAL_SETTINGS_HEADING}
          />
        }
      />
      <div className="space-y-8">
        <OccupancySection
          organizationId={organizationId}
          eventId={eventId}
          terms={rooms.data.terms}
          updatedAt={rooms.dataUpdatedAt}
          isRefreshing={rooms.isFetching}
          hasRefreshFailed={rooms.isRefetchError}
          onRefresh={rooms.refetch}
        />
        <RoomProposalSection
          attribute={rules?.hardAttribute ? attributeLabel(rules.hardAttribute) : null}
          organizationId={organizationId}
          eventId={eventId}
          terms={event.terms}
          termId={termId}
          // Switching the term stays on the page; Back returns to the previous one.
          onSelectTerm={(next) => void navigate({ search: { term: next }, resetScroll: false })}
        />
        <RoomsSection
          organizationId={organizationId}
          eventId={eventId}
          overview={rooms.data}
          onChanged={refreshEvent}
        />
      </div>
    </WorkspacePage>
  )
}

// A foreign and a missing event look the same (S2-03).
function Unavailable() {
  const { user } = useSession()
  const { organizationId } = Route.useParams()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  return (
    <WorkspacePage>
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization?.name}
          />
        }
        title="Ubytování"
      />
      <RecordUnavailable
        action={
          <BackToEventsButton
            organizationId={organizationId}
            userId={user?.id}
          />
        }
      />
    </WorkspacePage>
  )
}
