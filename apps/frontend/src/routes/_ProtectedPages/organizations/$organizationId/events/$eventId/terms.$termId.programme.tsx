import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Badge } from "@/components/ui/badge"
import { formatCalendarRange } from "@/lib/date"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { TermProgrammeSection } from "@/features/programme/components/TermProgrammeSection"

// Správa akce → Nastavení → Termíny a ceny → Program termínu (F65). Part of
// the existing term settings, not a new navigation branch.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/terms/$termId/programme",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: TermProgrammePage,
  errorComponent: Unavailable,
})

function TermProgrammePage() {
  const { organizationId, eventId, termId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const term = event.terms.find((candidate) => candidate.id === termId)
  const refreshEvent = useRefreshEvent(organizationId, eventId)

  if (!term) return <Unavailable />

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <Seo title={`Program – ${term.label}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            section={
              <Link
                to={ROUTES.eventSettings}
                params={{ organizationId, eventId }}
              >
                Nastavení
              </Link>
            }
            current={`Program – ${term.label}`}
          />
        }
        title={`Program – ${term.label}`}
        badge={
          <Badge variant="secondary">{formatCalendarRange(term.startDate, term.endDate)}</Badge>
        }
        description={event.name}
      />
      <TermProgrammeSection
        organizationId={organizationId}
        eventId={eventId}
        term={term}
        onChanged={refreshEvent}
      />
    </section>
  )
}

// A foreign and a missing event or term look the same (S2-03).
function Unavailable() {
  const { user } = useSession()
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
        title="Program termínu"
      />
      <RecordUnavailable
        action={
          <BackToEventsButton
            organizationId={organizationId}
            userId={user?.id}
          />
        }
      />
    </section>
  )
}
