import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { WorkspacePage } from "@/components/WorkspacePage"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { EventProgramme } from "@/features/programme/components/EventProgramme"

// Správa akce → Program (F65-1): a section of its own beside Ubytování. The
// selected term stays in the URL, so a refresh and the way back keep it.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/programme",
)({
  validateSearch: z.object({ term: z.string().uuid().optional().catch(undefined) }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: ProgrammePage,
  errorComponent: Unavailable,
})

function ProgrammePage() {
  const { organizationId, eventId } = Route.useParams()
  const { term } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const refreshEvent = useRefreshEvent(organizationId, eventId)
  const selectedTermId =
    event.terms.find((candidate) => candidate.id === term)?.id ?? event.terms[0]?.id ?? ""

  return (
    <WorkspacePage>
      <Seo title={`Program – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Program"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
      />
      <EventProgramme
        organizationId={organizationId}
        eventId={eventId}
        terms={event.terms}
        selectedTermId={selectedTermId}
        // Switching a term stays at the place on the page; Back returns to the previous term.
        onSelectTerm={(next) => void navigate({ search: { term: next }, resetScroll: false })}
        onChanged={refreshEvent}
      />
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
        title="Program"
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
