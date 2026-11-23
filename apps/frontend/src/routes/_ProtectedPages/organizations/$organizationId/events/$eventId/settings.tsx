import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { WorkspacePage } from "@/components/WorkspacePage"

import { evaluationKeys } from "@/features/accommodation/api/evaluationQueryOptions"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import { EvaluationModeSection } from "@/features/accommodation/components/EvaluationModeSection"
import { HardAttributeSection } from "@/features/accommodation/components/HardAttributeSection"
import { RoomProposalModeSection } from "@/features/accommodation/components/RoomProposalModeSection"
import { RoomProposalPreferencesSection } from "@/features/accommodation/components/RoomProposalPreferencesSection"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { ChangeApprovalSection } from "@/features/events/components/ChangeApprovalSection"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventLockedAlert } from "@/features/events/components/EventLockedAlert"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { PaymentSettingsSection } from "@/features/events/components/PaymentSettingsSection"
import { PresentationSection } from "@/features/events/components/PresentationSection"
import { PublicEventAccessSection } from "@/features/events/components/PublicEventAccessSection"
import { TermsSection } from "@/features/events/components/TermsSection"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"
import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { questionKeys } from "@/features/registrations/api/questionQueryOptions"
import { RegistrationQuestionsSection } from "@/features/registrations/components/RegistrationQuestionsSection"

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
    <WorkspacePage>
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
        <CollapsibleSection
          headingId="basic-details-heading"
          title="Základní údaje"
          actions={
            !event.isLocked ? (
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
            ) : null
          }
        >
          <Card>
            <CardContent>
              <DefinitionList layout="stacked">
                <DefinitionRow label="Název">{event.name}</DefinitionRow>
                <DefinitionRow label="Místo">{event.location}</DefinitionRow>
                <DefinitionRow label="Popis">
                  <span className="whitespace-pre-line">{event.description}</span>
                </DefinitionRow>
              </DefinitionList>
            </CardContent>
          </Card>
        </CollapsibleSection>

        <TermsSection
          organizationId={organizationId}
          event={event}
        />

        <PaymentSettingsSection
          organizationId={organizationId}
          event={event}
        />
        <ChangeApprovalSection
          organizationId={organizationId}
          event={event}
        />
        <PublicEventAccessSection
          organizationId={organizationId}
          event={event}
        />
        <PresentationSection
          organizationId={organizationId}
          event={event}
        />
        <RegistrationQuestionsSection
          organizationId={organizationId}
          eventId={eventId}
          // The rules list the questions as attributes, with their labels.
          invalidate={[
            evaluationKeys.hardAttribute(organizationId, eventId),
            roomProposalKeys.preferences(organizationId, eventId),
          ]}
        />
        <HardAttributeSection
          organizationId={organizationId}
          eventId={eventId}
          // Who needs a determination, and which questions the rules use.
          invalidate={[
            eventRegistrationKeys.event(organizationId, eventId),
            questionKeys.event(organizationId, eventId),
          ]}
        />
        <RoomProposalPreferencesSection
          organizationId={organizationId}
          eventId={eventId}
          invalidate={[questionKeys.event(organizationId, eventId)]}
        />
        <EvaluationModeSection
          organizationId={organizationId}
          eventId={eventId}
        >
          <RoomProposalModeSection
            organizationId={organizationId}
            eventId={eventId}
          />
        </EvaluationModeSection>
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
        title="Akce a turnusy"
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
