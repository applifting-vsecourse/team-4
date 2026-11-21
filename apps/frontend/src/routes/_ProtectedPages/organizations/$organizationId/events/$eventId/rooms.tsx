import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { WorkspacePage } from "@/components/WorkspacePage"

import { placementKeys } from "@/features/accommodation/api/placementQueryOptions"
import { ACCOMMODATION_RULES_HEADING } from "@/features/accommodation/components/HardAttributeSection"
import { RoomAssignmentSection } from "@/features/accommodation/components/RoomAssignmentSection"
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

// Správa akce → Ubytování: occupancy of the terms (S2-10), the room
// placements of the selected term (F14-2) and rooms (S2-05). The term is in
// the URL, so a refresh and the way back keep it.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/rooms",
)({
  // The term of the room placements; the first term otherwise.
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
  const termId = event.terms.find((t) => t.id === term)?.id ?? event.terms[0]?.id
  // The term capacities on the event page are derived from these rooms.
  const refreshEvent = useRefreshEvent(organizationId, eventId)
  const queryClient = useQueryClient()
  // A room change also changes the rooms and beds of the placements.
  const roomsChanged = () =>
    Promise.all([refreshEvent(), queryClient.invalidateQueries({ queryKey: placementKeys.all() })])

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
            section={ACCOMMODATION_RULES_HEADING}
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
        {termId ? (
          <RoomAssignmentSection
            organizationId={organizationId}
            eventId={eventId}
            terms={event.terms}
            selectedTermId={termId}
            // Switching the term stays on the page; Back returns to the previous one.
            onSelectTerm={(next) => void navigate({ search: { term: next }, resetScroll: false })}
          />
        ) : null}
        <RoomsSection
          organizationId={organizationId}
          eventId={eventId}
          overview={rooms.data}
          onChanged={roomsChanged}
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
