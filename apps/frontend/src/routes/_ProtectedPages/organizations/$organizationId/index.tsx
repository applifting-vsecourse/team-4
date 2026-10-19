import { useEffect } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventsQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventsEmptyState } from "@/features/events/components/EventsEmptyState"
import { EventsTable } from "@/features/events/components/EventsTable"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { OrganizationUnavailable } from "@/features/organizations/components/OrganizationUnavailable"
import { rememberOrganization } from "@/features/organizations/lib/lastOrganization"

// Events list of one own organization.
export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventsQueryOptions(params.organizationId)),
    ]),
  component: OrganizationEventsPage,
  // A foreign and a missing organization look the same (S2-03).
  errorComponent: OrganizationUnavailable,
})

function OrganizationEventsPage() {
  const { organizationId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: events } = useSuspenseQuery(eventsQueryOptions(organizationId))
  const { user } = useSession()

  useEffect(() => {
    if (user) rememberOrganization(user.id, organization.id)
  }, [user, organization.id])

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <Seo title={organization.name} />
      <p className="text-sm text-muted-foreground">Organizace</p>
      <h1 className="text-h2">{organization.name}</h1>
      <div className="mt-8 mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2 className="text-h4">Akce</h2>
        {events.length > 0 ? (
          <Button asChild>
            <Link
              to={ROUTES.newEvent}
              params={{ organizationId }}
            >
              <Plus />
              Nová akce
            </Link>
          </Button>
        ) : null}
      </div>
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
