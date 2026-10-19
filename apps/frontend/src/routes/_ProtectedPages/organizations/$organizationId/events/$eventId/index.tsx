import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLockedAlert } from "@/features/events/components/EventLockedAlert"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { TermsSection } from "@/features/events/components/TermsSection"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"

// Management of one event: its details and terms (S2-04).
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
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <Seo title={event.name} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Termíny"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
        actions={
          event.isLocked ? null : (
            <Button
              asChild
              variant="outline"
            >
              <Link
                to={ROUTES.editEvent}
                params={{ organizationId, eventId }}
              >
                <Pencil />
                Upravit akci
              </Link>
            </Button>
          )
        }
      />
      {/* Not in the wireframe: without it a locked event's description would
          be visible nowhere, and S2-04 keeps locked data visible. */}
      <p className="-mt-4 mb-8 max-w-prose text-sm whitespace-pre-line">{event.description}</p>

      {event.isLocked ? (
        <div className="mb-8">
          <EventLockedAlert status={event.status} />
        </div>
      ) : null}

      <TermsSection
        organizationId={organizationId}
        event={event}
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
        title="Akce a turnusy"
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
