import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"

import { PageHeader } from "@/components/PageHeader"
import { Seo } from "@/components/Seo"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLoadError } from "@/features/events/components/EventLoadError"
import { EventNavigation } from "@/features/events/components/EventNavigation"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { MissingTermNotice } from "@/features/events/components/MissingTermNotice"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"

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
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
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
      <MissingTermNotice
        organizationId={organizationId}
        event={event}
      />
      <EventNavigation
        organizationId={organizationId}
        eventId={eventId}
      />
    </section>
  )
}

function Unavailable({ error, reset }: ErrorComponentProps) {
  const { organizationId } = Route.useParams()
  const router = useRouter()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  return (
    <EventLoadError
      organizationId={organizationId}
      organizationName={organization?.name}
      error={error}
      onRetry={() => {
        reset()
        void router.invalidate()
      }}
    />
  )
}
