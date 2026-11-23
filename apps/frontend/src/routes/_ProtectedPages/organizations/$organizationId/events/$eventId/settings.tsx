import { useEffect } from "react"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router"
import { Pencil } from "lucide-react"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspacePage } from "@/components/WorkspacePage"

import { evaluationKeys } from "@/features/accommodation/api/evaluationQueryOptions"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import { EvaluationModeSection } from "@/features/accommodation/components/EvaluationModeSection"
import { HardAttributeSection } from "@/features/accommodation/components/HardAttributeSection"
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

const settingsTabs = ["event", "registration", "payments", "accommodation", "automation"] as const
type SettingsTab = (typeof settingsTabs)[number]

const tabForAnchor: Record<string, SettingsTab> = {
  "basic-details-heading": "event",
  "terms-heading": "event",
  "public-access-heading": "event",
  "publication-heading": "event",
  "registration-heading": "event",
  "public-presentation-heading": "event",
  "change-approval-heading": "registration",
  "registration-questions-heading": "registration",
  "payments-heading": "payments",
  "accommodation-rules-heading": "accommodation",
  "room-proposal-settings-heading": "accommodation",
  "automation-heading": "automation",
}

// Configuration of one event, ordered from basic details to opening registration.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/settings",
)({
  validateSearch: z.object({ tab: z.enum(settingsTabs).optional().catch(undefined) }),
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
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  const hash = useRouterState({ select: (state) => state.location.hash })
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const anchorId = hash.replace(/^#/, "")
  const tabFromAnchor = tabForAnchor[anchorId]
  const activeTab = tabFromAnchor ?? tab ?? "event"

  // Normalize the default and anchor-selected tab into the URL without adding
  // a history entry. User tab changes below do create entries for Back/Forward.
  useEffect(() => {
    if (tab !== activeTab) {
      void navigate({
        search: (previous) => ({ ...previous, tab: activeTab }),
        hash: anchorId,
        replace: true,
      })
    }
  }, [activeTab, anchorId, navigate, tab])

  // TanStack's initial hash scroll may run before the selected tab is visible.
  // Scroll again after the tab and its section have committed to the DOM.
  useEffect(() => {
    if (!anchorId) return
    let firstFrame = 0
    let secondFrame = 0
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(anchorId)
        if (!target || target.closest("[hidden]")) return
        target.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [activeTab, anchorId])

  const selectTab = (value: string) => {
    if (!settingsTabs.includes(value as SettingsTab)) return
    void navigate({
      search: (previous) => ({ ...previous, tab: value as SettingsTab }),
      hash: "",
      resetScroll: false,
    })
  }

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
      <div className="space-y-6">
        {event.isLocked ? <EventLockedAlert status={event.status} /> : null}
        <Tabs
          value={activeTab}
          onValueChange={selectTab}
          className="min-w-0"
        >
          <HorizontalOverflowViewport>
            <TabsList
              aria-label="Kategorie nastavení"
              className="w-max min-w-full"
            >
              <TabsTrigger value="event">Akce</TabsTrigger>
              <TabsTrigger value="registration">Přihláška</TabsTrigger>
              <TabsTrigger value="payments">Platby</TabsTrigger>
              <TabsTrigger value="accommodation">Ubytování</TabsTrigger>
              <TabsTrigger value="automation">Automatizace</TabsTrigger>
            </TabsList>
          </HorizontalOverflowViewport>
          <TabsContent
            value="event"
            forceMount
            className="min-w-0 data-[state=inactive]:hidden"
          >
            <div className="space-y-10">
              <CollapsibleSection
                headingId="basic-details-heading"
                title="Základní údaje"
                alwaysOpen
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
              <PresentationSection
                organizationId={organizationId}
                event={event}
              />
              <PublicEventAccessSection
                organizationId={organizationId}
                event={event}
              />
            </div>
          </TabsContent>
          <TabsContent
            value="registration"
            forceMount
            className="min-w-0 data-[state=inactive]:hidden"
          >
            <div className="space-y-10">
              <RegistrationQuestionsSection
                organizationId={organizationId}
                eventId={eventId}
                invalidate={[
                  evaluationKeys.hardAttribute(organizationId, eventId),
                  roomProposalKeys.preferences(organizationId, eventId),
                ]}
              />
              <ChangeApprovalSection
                organizationId={organizationId}
                event={event}
              />
            </div>
          </TabsContent>
          <TabsContent
            value="payments"
            forceMount
            className="min-w-0 data-[state=inactive]:hidden"
          >
            <div className="space-y-10">
              <PaymentSettingsSection
                organizationId={organizationId}
                event={event}
              />
            </div>
          </TabsContent>
          <TabsContent
            value="accommodation"
            forceMount
            className="min-w-0 data-[state=inactive]:hidden"
          >
            <div className="space-y-10">
              <HardAttributeSection
                organizationId={organizationId}
                eventId={eventId}
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
            </div>
          </TabsContent>
          <TabsContent
            value="automation"
            forceMount
            className="min-w-0 data-[state=inactive]:hidden"
          >
            <div className="space-y-10">
              <EvaluationModeSection
                organizationId={organizationId}
                eventId={eventId}
              />
            </div>
          </TabsContent>
        </Tabs>
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
