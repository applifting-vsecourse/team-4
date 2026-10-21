import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLockedAlert } from "@/features/events/components/EventLockedAlert"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { PaymentSettingsSection } from "@/features/events/components/PaymentSettingsSection"
import { RegistrationSection } from "@/features/events/components/RegistrationSection"
import { TermsSection } from "@/features/events/components/TermsSection"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"

// Configuration of one event, ordered from basic details to opening registration.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/settings",
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
      <Seo title="Nastavení" />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Nastavení"
          />
        }
        title="Nastavení"
        badge={<EventStatusBadge status={event.status} />}
      />
      <div className="space-y-10">
        {event.isLocked ? <EventLockedAlert status={event.status} /> : null}
        <section aria-labelledby="event-details-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2
              id="event-details-heading"
              className="text-h4"
            >
              Základní údaje
            </h2>
            {!event.isLocked ? (
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
            ) : null}
          </div>
          <Card>
            <CardContent className="space-y-4">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Název</dt>
                  <dd className="mt-1 break-words">{event.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Místo</dt>
                  <dd className="mt-1 break-words">{event.location}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Popis</dt>
                  <dd className="mt-1 break-words whitespace-pre-line">{event.description}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </section>

        <TermsSection
          organizationId={organizationId}
          event={event}
        />

        <PaymentSettingsSection
          organizationId={organizationId}
          event={event}
        />
        <RegistrationSection
          organizationId={organizationId}
          event={event}
        />
      </div>
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
