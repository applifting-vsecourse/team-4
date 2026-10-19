import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLockedAlert } from "@/features/events/components/EventLockedAlert"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { EventUnavailable } from "@/features/events/components/EventUnavailable"
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
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <Seo title={event.name} />
      <EventBreadcrumb
        organizationId={organizationId}
        organizationName={organization.name}
        current={event.name}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h2 break-words">{event.name}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{event.location}</p>
        </div>
        {event.isLocked ? null : (
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
        )}
      </div>
      <p className="mt-4 max-w-prose text-sm whitespace-pre-line">{event.description}</p>

      {event.isLocked ? (
        <div className="mt-6">
          <EventLockedAlert status={event.status} />
        </div>
      ) : null}

      <div className="mt-8">
        <TermsSection
          organizationId={organizationId}
          event={event}
        />
      </div>
    </section>
  )
}

function Unavailable() {
  const { organizationId } = Route.useParams()
  return <EventUnavailable organizationId={organizationId} />
}
