import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { WorkspacePage } from "@/components/WorkspacePage"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { BankTransactionsSection } from "@/features/payments/components/BankTransactionsSection"
import { PaymentsOverviewSection } from "@/features/registrations/components/PaymentsOverviewSection"

// An empty payments overview points at the statement import below it.
const STATEMENT_IMPORT_HEADING_ID = "statement-import-heading"

// Správa akce → Platby: received payments and balances (S4-09) and the import
// of bank statements (F23).
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/payments",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: PaymentsPage,
  errorComponent: Unavailable,
})

function PaymentsPage() {
  const { organizationId, eventId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))

  return (
    <WorkspacePage>
      <Seo title={`Platby – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Platby"
          />
        }
        title={event.name}
        badge={<EventStatusBadge status={event.status} />}
        description={event.location}
      />
      <div className="space-y-10">
        <PaymentsOverviewSection
          organizationId={organizationId}
          eventId={eventId}
          statementImportHeadingId={STATEMENT_IMPORT_HEADING_ID}
        />
        <BankTransactionsSection
          organizationId={organizationId}
          eventId={eventId}
          headingId={STATEMENT_IMPORT_HEADING_ID}
        />
      </div>
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
        title="Platby"
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
