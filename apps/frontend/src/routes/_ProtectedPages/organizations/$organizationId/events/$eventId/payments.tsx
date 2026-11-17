import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
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
import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { PaymentsOverviewSection } from "@/features/registrations/components/PaymentsOverviewSection"

// Správa akce → Platby: received payments and balances (S4-09), the import of
// bank statements (F23) and the queue of unpaired transactions (F24).
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
  const queryClient = useQueryClient()

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
        />
        <BankTransactionsSection
          organizationId={organizationId}
          eventId={eventId}
          // A paired transaction is a received payment of a registration: the
          // overview, the registration list and the detail show it (F24).
          onPaymentsChanged={() =>
            void queryClient.invalidateQueries({
              queryKey: eventRegistrationKeys.event(organizationId, eventId),
            })
          }
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
