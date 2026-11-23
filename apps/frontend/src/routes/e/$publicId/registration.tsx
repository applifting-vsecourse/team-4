import { useQueryClient, useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { CalendarX } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { PublicShell } from "@/components/PublicShell"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { formatPhone } from "@/lib/phone"

import { participantProfileQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { type ParticipantProfile } from "@/features/participant-access/api/participantSchemas"
import { ParticipantAwareHeader } from "@/features/participant-access/components/ParticipantAwareHeader"
import { publicEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import { PublicEventView } from "@/features/public-events/components/PublicEventView"
import {
  PublicRegistration,
  type RegistrationContact,
} from "@/features/registrations/components/PublicRegistration"

// What the profile holds, as the form's contact details; the sign-in e-mail too.
const contactOf = (profile: ParticipantProfile): RegistrationContact => ({
  firstName: profile.firstName ?? "",
  lastName: profile.lastName ?? "",
  email: profile.email,
  phone: profile.phone ? formatPhone(profile.phone) : "",
})

// The registration form (S2-06, S2-07): public, no sign-in, governed by the
// registration alone, so the organizer's link works also for an unpublished event.
export const Route = createFileRoute("/e/$publicId/registration")({
  loader: async ({ context, params }) => {
    const [, profile] = await Promise.all([
      context.queryClient.ensureQueryData(publicEventQueryOptions(params.publicId)),
      // A signed-in participant's profile prefills the form (S4-08). It is only
      // a convenience: without a session or when it fails, the form starts empty.
      context.queryClient.fetchQuery(participantProfileQueryOptions()).catch(() => null),
    ])
    return { contact: profile ? contactOf(profile) : null }
  },
  // Every visit reads the profile again: a cached match would prefill values
  // from before a logout or a profile change.
  gcTime: 0,
  component: PublicRegistrationPage,
  errorComponent: PublicRegistrationErrorPage,
})

function PublicRegistrationPage() {
  const { publicId } = Route.useParams()
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(publicId))
  const { contact } = Route.useLoaderData()
  const queryClient = useQueryClient()

  return (
    <PublicShell header={<ParticipantAwareHeader />}>
      <Seo title={event?.name ?? "Akce není dostupná"} />
      {event ? (
        <PublicEventView
          publicId={publicId}
          event={event}
          registration={
            <PublicRegistration
              publicId={publicId}
              terms={event.terms}
              conditions={event.conditions}
              questions={event.questions}
              questionsVersion={event.questionsVersion}
              isGenderRequired={event.isGenderRequired}
              // A question changed since the form opened: read them again.
              onQuestionsChanged={() =>
                queryClient.invalidateQueries({
                  queryKey: publicEventQueryOptions(publicId).queryKey,
                })
              }
              contact={contact}
            />
          }
        />
      ) : (
        // A draft and an unknown event, with no data of any event.
        <RecordUnavailable
          title="Akce není dostupná"
          icon={CalendarX}
        />
      )}
    </PublicShell>
  )
}

// Loading failed (network, server), which is not the unavailable state.
function PublicRegistrationErrorPage() {
  const router = useRouter()
  const { reset } = useQueryErrorResetBoundary()

  return (
    <PublicShell header={<ParticipantAwareHeader />}>
      <Seo title="Akci se nepodařilo načíst" />
      <LoadError
        variant="page"
        title="Akci se nepodařilo načíst"
        description="Zkontrolujte připojení a zkuste to znovu."
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </PublicShell>
  )
}
