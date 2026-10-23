import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventsQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventsEmptyState } from "@/features/events/components/EventsEmptyState"
import { EventsTable } from "@/features/events/components/EventsTable"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"

// "Akce a turnusy": the events of one own organization (Wireframy O5, W02).
export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventsQueryOptions(params.organizationId)),
    ]),
  component: OrganizationEventsPage,
  errorComponent: OrganizationUnavailable,
})

function OrganizationEventsPage() {
  const { organizationId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: events } = useSuspenseQuery(eventsQueryOptions(organizationId))

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <Seo title={`Akce a turnusy · ${organization.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
          />
        }
        title="Akce a turnusy"
        actions={
          events.length > 0 ? (
            <Button asChild>
              <Link
                to={ROUTES.newEvent}
                params={{ organizationId }}
              >
                <Plus />
                Nová akce
              </Link>
            </Button>
          ) : null
        }
      />
      {events.length > 0 ? (
        <EventsTable
          organizationId={organizationId}
          events={events}
        />
      ) : (
        <EventsEmptyState organizationId={organizationId} />
      )}
    </section>
  )
}

// A foreign and a missing organization look the same (S2-03, Wireframy N1).
function OrganizationUnavailable() {
  const { organizationId } = Route.useParams()
  const { user } = useSession()
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <PageHeader title="Akce a turnusy" />
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
