import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import {
  registrationFilterSchema,
  type RegistrationFilter,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { RegistrationsSection } from "@/features/registrations/components/RegistrationsSection"

// Správa akce → Přihlášky → Seznam přihlášených (S2-11). The filters are in
// the URL, so a refresh, "Aktualizovat" and the way back keep them.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/registrations/",
)({
  validateSearch: registrationFilterSchema,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: RegistrationsPage,
  errorComponent: Unavailable,
})

function RegistrationsPage() {
  const { organizationId, eventId } = Route.useParams()
  const filter = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))

  const setFilter = (next: RegistrationFilter) => void navigate({ search: next, replace: true })

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <Seo title={`Přihlášky – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Přihlášky"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
      />
      <RegistrationsSection
        organizationId={organizationId}
        eventId={eventId}
        terms={event.terms}
        filter={filter}
        onFilterChange={setFilter}
      />
    </section>
  )
}

// A foreign and a missing event look the same (S2-03, Wireframy N1).
function Unavailable() {
  const { organizationId } = Route.useParams()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization?.name}
          />
        }
        title="Přihlášky"
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
