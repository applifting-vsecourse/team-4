import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { z } from "zod"

import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspacePage } from "@/components/WorkspacePage"

import { hardAttributeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { placementKeys } from "@/features/accommodation/api/placementQueryOptions"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import { AccommodationTermTabs } from "@/features/accommodation/components/AccommodationTermTabs"
import { RoomAssignmentSection } from "@/features/accommodation/components/RoomAssignmentSection"
import { RoommateWishStatesSection } from "@/features/accommodation/components/RoommateWishStatesSection"
import { RoomProposalSection } from "@/features/accommodation/components/RoomProposalSection"
import { attributeLabel } from "@/features/accommodation/lib/evaluationView"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { roomsQueryOptions } from "@/features/rooms/api/roomQueryOptions"
import { OccupancySection } from "@/features/rooms/components/OccupancySection"
import { RoomsSection } from "@/features/rooms/components/RoomsSection"

// Správa akce → Ubytování keeps occupancy, room splitting and room capacity
// on one page. Both the current section and term are in the URL.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/rooms",
)({
  // The term of the room proposal and placements; the first term otherwise.
  validateSearch: z.object({
    tab: z.enum(["occupancy", "split", "rooms"]).optional().catch(undefined),
    term: z.string().uuid().optional().catch(undefined),
    view: z.enum(["assignment", "proposal"]).optional().catch(undefined),
  }),
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
  const { tab, term, view } = Route.useSearch()
  const navigate = Route.useNavigate()
  // The reason H names the hard attribute; while it loads or if it fails,
  // the reason keeps its generic wording ("pravidla ubytování") on purpose.
  const { data: rules } = useQuery(hardAttributeQueryOptions(organizationId, eventId))
  const attribute = rules?.hardAttribute ? attributeLabel(rules.hardAttribute) : null
  const termId = event.terms.find((t) => t.id === term)?.id ?? event.terms[0]?.id
  const selectedTab = tab ?? "occupancy"
  const selectedSplitView = view ?? "assignment"
  // In-page selections add history entries and preserve the other selection.
  const selectTerm = (next: string) =>
    void navigate({ search: (previous) => ({ ...previous, term: next }), resetScroll: false })
  const selectTab = (next: string) =>
    void navigate({
      search: (previous) => ({
        ...previous,
        tab: next as typeof selectedTab,
        term: previous.term ?? termId,
        ...(next === "split" ? { view: previous.view ?? "assignment" } : {}),
      }),
      resetScroll: false,
    })
  const selectSplitView = (next: "assignment" | "proposal") =>
    void navigate({
      search: (previous) => ({
        ...previous,
        tab: "split",
        term: previous.term ?? termId,
        view: next,
      }),
      resetScroll: false,
    })
  // The term capacities on the event page are derived from these rooms.
  const refreshEvent = useRefreshEvent(organizationId, eventId)
  const queryClient = useQueryClient()
  // A room change also changes the rooms and beds of the placements, and
  // makes the room proposals out of date.
  const roomsChanged = () =>
    Promise.all([
      refreshEvent(),
      queryClient.invalidateQueries({ queryKey: placementKeys.all() }),
      queryClient.invalidateQueries({
        queryKey: roomProposalKeys.terms(organizationId, eventId),
      }),
    ])

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
      />
      <Tabs
        value={selectedTab}
        onValueChange={selectTab}
      >
        <HorizontalOverflowViewport>
          <TabsList
            aria-label="Ubytování"
            className="w-max min-w-full"
          >
            <TabsTrigger value="occupancy">Obsazenost</TabsTrigger>
            <TabsTrigger value="split">Rozdělení</TabsTrigger>
            <TabsTrigger value="rooms">Pokoje a kapacity</TabsTrigger>
          </TabsList>
        </HorizontalOverflowViewport>
        <TabsContent
          value="occupancy"
          className="mt-6"
        >
          <OccupancySection
            organizationId={organizationId}
            eventId={eventId}
            terms={rooms.data.terms}
            updatedAt={rooms.dataUpdatedAt}
            isRefreshing={rooms.isFetching}
            hasRefreshFailed={rooms.isRefetchError}
            onRefresh={rooms.refetch}
          />
        </TabsContent>
        <TabsContent
          value="split"
          className="mt-6"
        >
          {termId ? (
            <AccommodationTermTabs
              terms={event.terms}
              selectedTermId={termId}
              onSelectTerm={selectTerm}
            >
              {selectedSplitView === "proposal" ? (
                <div className="space-y-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectSplitView("assignment")}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Zpět na uložené rozdělení
                  </Button>
                  <RoomProposalSection
                    attribute={attribute}
                    organizationId={organizationId}
                    eventId={eventId}
                    terms={event.terms}
                    termId={termId}
                    onApplied={() => selectSplitView("assignment")}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  <RoomProposalSection
                    attribute={attribute}
                    organizationId={organizationId}
                    eventId={eventId}
                    terms={event.terms}
                    termId={termId}
                    presentation="summary"
                    onViewProposal={() => selectSplitView("proposal")}
                  />
                  <RoomAssignmentSection
                    organizationId={organizationId}
                    eventId={eventId}
                    selectedTermId={termId}
                  />
                  <RoommateWishStatesSection
                    organizationId={organizationId}
                    eventId={eventId}
                    termId={termId}
                    attribute={attribute}
                  />
                </div>
              )}
            </AccommodationTermTabs>
          ) : (
            <RoomProposalSection
              organizationId={organizationId}
              eventId={eventId}
              terms={event.terms}
              termId=""
            />
          )}
        </TabsContent>
        <TabsContent
          value="rooms"
          className="mt-6"
        >
          {termId ? (
            <AccommodationTermTabs
              terms={event.terms}
              selectedTermId={termId}
              onSelectTerm={selectTerm}
            >
              <RoomsSection
                organizationId={organizationId}
                eventId={eventId}
                overview={rooms.data}
                selectedTermId={termId}
                onChanged={roomsChanged}
              />
            </AccommodationTermTabs>
          ) : (
            <RoomsSection
              organizationId={organizationId}
              eventId={eventId}
              overview={rooms.data}
              onChanged={roomsChanged}
            />
          )}
        </TabsContent>
      </Tabs>
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
