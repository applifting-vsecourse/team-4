import { useEffect } from "react"
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useLocation,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { WorkspacePage } from "@/components/WorkspacePage"
import { HTTPError } from "@/lib/api-client"

import { evaluationKeys } from "@/features/accommodation/api/evaluationQueryOptions"
import { RegistrationDeterminationPanel } from "@/features/accommodation/components/RegistrationDeterminationPanel"
import { RegistrationEvaluationHistory } from "@/features/accommodation/components/RegistrationEvaluationHistory"
import { RegistrationRoomPlacements } from "@/features/accommodation/components/RegistrationRoomPlacements"
import { RegistrationTermDecisions } from "@/features/accommodation/components/RegistrationTermDecisions"
import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import {
  eventRegistrationKeys,
  eventRegistrationQueryOptions,
} from "@/features/registrations/api/eventRegistrationQueryOptions"
import { OrganizerAccommodationCard } from "@/features/registrations/components/OrganizerAccommodationCard"
import { OrganizerNeedsSection } from "@/features/registrations/components/OrganizerNeedsSection"
import { OrganizerRoommateWishes } from "@/features/registrations/components/OrganizerRoommateWishes"
import { RecordPaymentDialog } from "@/features/registrations/components/RecordPaymentDialog"
import {
  RegistrationChangeDecision,
  RegistrationChangeHistory,
} from "@/features/registrations/components/RegistrationChangeDecision"
import { RegistrationDetail } from "@/features/registrations/components/RegistrationDetail"
import {
  DEFAULT_REGISTRATION_DETAIL_TAB,
  registrationDetailTabSchema,
} from "@/features/registrations/lib/detailTabs"

// Správa akce → Přihlášky → Detail účastníka (S2-11): the organizer's view of
// one registration, not the participant's account.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/registrations/$registrationId",
)({
  // Opened from Vyhodnocení (S3-01): the way back returns to the same term and queue.
  validateSearch: z.object({
    fromTerm: z.string().uuid().optional().catch(undefined),
    fromQueue: z.string().max(100).optional().catch(undefined),
    // The tab and the term it points at (F38-1); an unknown tab opens the default.
    tab: registrationDetailTabSchema.optional().catch(undefined),
    term: z.string().uuid().optional().catch(undefined),
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
      context.queryClient.ensureQueryData(
        eventRegistrationQueryOptions(params.organizationId, params.eventId, params.registrationId),
      ),
    ]),
  component: RegistrationPage,
  errorComponent: RegistrationErrorPage,
})

function RegistrationPage() {
  const { organizationId, eventId, registrationId } = Route.useParams()
  const { fromTerm, fromQueue, tab, term } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const registration = useSuspenseQuery(
    eventRegistrationQueryOptions(organizationId, eventId, registrationId),
  )
  const name = `${registration.data.firstName} ${registration.data.lastName}`
  const hash = useLocation({ select: (location) => location.hash })

  // The router's own hash scroll may run before the selected tab is visible
  // (a link to the diet of a registration, S5-04): scroll again once it is.
  useEffect(() => {
    if (!hash) return
    let firstFrame = 0
    let secondFrame = 0
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(hash)
        if (!target || target.closest("[hidden]")) return
        target.scrollIntoView({
          block: "center",
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
  }, [hash, tab])

  return (
    <WorkspacePage>
      <Seo title={`${name} – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            section={
              <Link
                to={ROUTES.eventRegistrations}
                params={{ organizationId, eventId }}
                search={
                  fromTerm ? { view: "evaluation", evaluationTerm: fromTerm, queue: fromQueue } : {}
                }
              >
                Přihlášky
              </Link>
            }
            current="Detail účastníka"
          />
        }
        title={name}
        description={event.name}
      />
      <RegistrationDetail
        registration={registration.data}
        tab={tab ?? DEFAULT_REGISTRATION_DETAIL_TAB}
        // A tab is a history entry of its own, and the scroll stays where it was.
        onTabChange={(next) =>
          void navigate({ search: (previous) => ({ ...previous, tab: next }), resetScroll: false })
        }
        notice={
          <RegistrationChangeDecision
            organizationId={organizationId}
            eventId={eventId}
            registrationId={registrationId}
            shouldShowHistory={false}
          />
        }
        paymentAction={
          <RecordPaymentDialog
            organizationId={organizationId}
            eventId={eventId}
            registrationId={registrationId}
          />
        }
        updatedAt={registration.dataUpdatedAt}
        isRefreshing={registration.isFetching}
        hasRefreshFailed={registration.isRefetchError}
        // Also reloads what hangs under the detail, e.g. the roommate wishes.
        onRefresh={() =>
          queryClient.invalidateQueries({
            queryKey: eventRegistrationKeys.detail(organizationId, eventId, registrationId),
          })
        }
        accommodation={
          <OrganizerAccommodationCard
            organizationId={organizationId}
            eventId={eventId}
            registration={registration.data}
            // The answer is an input of the evaluation: its proposals turn stale.
            onAnswerSaved={() =>
              void queryClient.invalidateQueries({
                queryKey: evaluationKeys.event(organizationId, eventId),
              })
            }
            determination={
              <RegistrationDeterminationPanel
                organizationId={organizationId}
                eventId={eventId}
                registrationId={registrationId}
                person={name}
                // The F64 notice follows the determination.
                invalidate={eventRegistrationKeys.detail(organizationId, eventId, registrationId)}
              />
            }
            wishes={
              <>
                <OrganizerRoommateWishes
                  organizationId={organizationId}
                  eventId={eventId}
                  registrationId={registrationId}
                />
                <RegistrationRoomPlacements
                  organizationId={organizationId}
                  eventId={eventId}
                  registrationId={registrationId}
                  confirmedTerms={registration.data.terms.filter(
                    (candidate) => candidate.status === "confirmed",
                  )}
                />
              </>
            }
          />
        }
        terms={
          <RegistrationTermDecisions
            organizationId={organizationId}
            eventId={eventId}
            registrationId={registrationId}
            person={name}
            terms={registration.data.terms}
            selectedTermId={registration.data.terms.find((t) => t.termId === term)?.termId}
            invalidate={eventRegistrationKeys.detail(organizationId, eventId, registrationId)}
          />
        }
        history={
          <>
            <RegistrationEvaluationHistory
              organizationId={organizationId}
              eventId={eventId}
              registrationId={registrationId}
              person={name}
            />
            <RegistrationChangeHistory
              organizationId={organizationId}
              eventId={eventId}
              registrationId={registrationId}
            />
          </>
        }
        needs={
          <OrganizerNeedsSection
            organizationId={organizationId}
            eventId={eventId}
            registration={registration.data}
            onReload={() => registration.refetch()}
          />
        }
      />
    </WorkspacePage>
  )
}

// A registration of another event or organization looks like a missing one
// (S2-03); any other failure can be retried and is never shown as data.
function RegistrationErrorPage({ error, reset }: ErrorComponentProps) {
  const { organizationId, eventId } = Route.useParams()
  const router = useRouter()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  const isGone = error instanceof HTTPError && [403, 404].includes(error.response.status)

  return (
    <WorkspacePage>
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization?.name}
          />
        }
        title="Přihláška"
      />
      {isGone ? (
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
      ) : (
        <LoadError
          variant="page"
          onRetry={() => {
            reset()
            void router.invalidate()
          }}
          action={
            <Button
              asChild
              variant="ghost"
            >
              <Link
                to={ROUTES.eventRegistrations}
                params={{ organizationId, eventId }}
              >
                Zpět na přihlášky
              </Link>
            </Button>
          }
        />
      )}
    </WorkspacePage>
  )
}
