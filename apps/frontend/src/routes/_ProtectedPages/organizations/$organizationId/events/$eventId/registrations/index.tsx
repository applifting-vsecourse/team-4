import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { pendingChangesQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import {
  registrationFilterSchema,
  type RegistrationFilter,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { ChangeRequestsSection } from "@/features/registrations/components/ChangeRequestsSection"
import { RegistrationsSection } from "@/features/registrations/components/RegistrationsSection"

// Správa akce → Přihlášky → Seznam přihlášených (S2-11). The filters are in
// the URL, so a refresh, "Aktualizovat" and the way back keep them.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/registrations/",
)({
  validateSearch: registrationFilterSchema.extend({
    view: z.enum(["list", "approvals"]).optional().catch(undefined),
  }),
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
  const { view = "list", ...filter } = Route.useSearch()
  const navigate = Route.useNavigate()
  const pending = useQuery(pendingChangesQueryOptions(organizationId, eventId))
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))

  const setFilter = (next: RegistrationFilter) =>
    void navigate({ search: { ...next, view: view === "list" ? undefined : view }, replace: true })
  const setView = (next: string) =>
    void navigate({
      search: { ...filter, view: next === "approvals" ? "approvals" : undefined },
      replace: true,
    })

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
      <Tabs
        value={view}
        onValueChange={setView}
      >
        <TabsList>
          <TabsTrigger value="list">Seznam přihlášek</TabsTrigger>
          <TabsTrigger value="approvals">
            Ke schválení
            {pending.data && pending.data.length > 0 ? (
              <Badge variant="secondary">{pending.data.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <RegistrationsSection
            organizationId={organizationId}
            eventId={eventId}
            terms={event.terms}
            filter={filter}
            onFilterChange={setFilter}
          />
        </TabsContent>
        <TabsContent value="approvals">
          <ChangeRequestsSection
            organizationId={organizationId}
            eventId={eventId}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

// A foreign and a missing event look the same (S2-03).
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
