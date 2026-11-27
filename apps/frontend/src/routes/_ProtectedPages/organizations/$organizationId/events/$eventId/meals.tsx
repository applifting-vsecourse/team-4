import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { UtensilsCrossed } from "lucide-react"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { WorkspacePage } from "@/components/WorkspacePage"

import { AccommodationTermTabs } from "@/features/accommodation/components/AccommodationTermTabs"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { MealsPrintSummary } from "@/features/meals/components/MealsPrintSummary"
import { MealsSection } from "@/features/meals/components/MealsSection"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"

// Správa akce → Stravování (S5-04): one page with the term in the URL.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/meals",
)({
  // The selected term; the first one otherwise.
  validateSearch: z.object({
    term: z.string().uuid().optional().catch(undefined),
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: MealsPage,
  errorComponent: Unavailable,
})

function MealsPage() {
  const { organizationId, eventId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const { term } = Route.useSearch()
  const navigate = Route.useNavigate()
  const termId = event.terms.find((t) => t.id === term)?.id ?? event.terms[0]?.id

  return (
    <WorkspacePage>
      <div className="print:hidden">
        <Seo title={`Stravování – ${event.name}`} />
        <PageHeader
          breadcrumb={
            <EventBreadcrumb
              organizationId={organizationId}
              organizationName={organization.name}
              event={event}
              current="Stravování"
            />
          }
          title={event.name}
          badge={<EventStatusBadge status={event.status} />}
          description={event.location}
        />
        {termId ? (
          <AccommodationTermTabs
            terms={event.terms}
            selectedTermId={termId}
            onSelectTerm={(next) => void navigate({ search: { term: next }, resetScroll: false })}
          >
            <div className="mt-6">
              <MealsSection
                organizationId={organizationId}
                eventId={eventId}
                termId={termId}
              />
            </div>
          </AccommodationTermTabs>
        ) : (
          <EmptyState
            icon={UtensilsCrossed}
            title="Akce zatím nemá žádné termíny"
            description="Počty strávníků se odvozují od termínů akce."
            action={
              <Button
                asChild
                variant="outline"
              >
                <Link
                  to={ROUTES.eventSettings}
                  hash="terms-heading"
                  params={{ organizationId, eventId }}
                >
                  Přidat termín
                </Link>
              </Button>
            }
          />
        )}
      </div>
      {termId ? (
        <MealsPrintSummary
          organizationId={organizationId}
          eventId={eventId}
          termId={termId}
          eventName={event.name}
        />
      ) : null}
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
        title="Stravování"
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
