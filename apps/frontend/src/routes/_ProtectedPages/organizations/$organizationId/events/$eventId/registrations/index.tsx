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
import { WorkspacePage } from "@/components/WorkspacePage"

import { TermEvaluationSection } from "@/features/accommodation/components/TermEvaluationSection"
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

// Správa akce → Přihlášky → Seznam přihlášených (S2-11), Ke schválení
// (F35-2a) and Vyhodnocení (S3-01). The filters, the term and the queue are in
// the URL, so a refresh, "Aktualizovat" and the way back keep them.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/registrations/",
)({
  validateSearch: registrationFilterSchema.extend({
    view: z.enum(["list", "approvals", "evaluation"]).optional().catch(undefined),
    // The evaluated term and queue tab (S3-01); the first term otherwise.
    evaluationTerm: z.string().uuid().optional().catch(undefined),
    queue: z.string().max(100).optional().catch(undefined),
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
  const { view = "list", evaluationTerm, queue, ...filter } = Route.useSearch()
  const navigate = Route.useNavigate()
  const pending = useQuery(pendingChangesQueryOptions(organizationId, eventId))
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))

  const termId =
    event.terms.find((term) => term.id === evaluationTerm)?.id ?? event.terms[0]?.id ?? ""
  const setFilter = (next: RegistrationFilter) =>
    void navigate({ search: { ...next, view: view === "list" ? undefined : view }, replace: true })
  const setView = (next: string) =>
    void navigate({
      search: {
        ...filter,
        view: next === "approvals" || next === "evaluation" ? next : undefined,
      },
      replace: true,
    })
  const setEvaluation = (selection: { termId: string; queue: string }) =>
    void navigate({
      search: {
        ...filter,
        view: "evaluation",
        evaluationTerm: selection.termId,
        queue: selection.queue === "all" ? undefined : selection.queue,
      },
      replace: true,
    })

  return (
    <WorkspacePage>
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
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="list">Seznam přihlášek</TabsTrigger>
            <TabsTrigger value="approvals">
              Ke schválení
              {pending.data && pending.data.length > 0 ? (
                <Badge variant="secondary">{pending.data.length}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="evaluation">Vyhodnocení</TabsTrigger>
          </TabsList>
        </div>
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
        <TabsContent value="evaluation">
          {view === "evaluation" ? (
            <TermEvaluationSection
              // Another term starts without the previous term's request state.
              key={termId}
              organizationId={organizationId}
              eventId={eventId}
              terms={event.terms}
              termId={termId}
              queue={queue ?? "all"}
              onSelect={setEvaluation}
              renderName={(person) => (
                <Link
                  to={ROUTES.registration}
                  params={{ organizationId, eventId, registrationId: person.id }}
                  search={{ fromTerm: termId, fromQueue: queue }}
                  className="text-foreground underline"
                >
                  {person.name}
                </Link>
              )}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </WorkspacePage>
  )
}

// A foreign and a missing event look the same (S2-03).
function Unavailable() {
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
    </WorkspacePage>
  )
}
