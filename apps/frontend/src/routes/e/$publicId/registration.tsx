import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { CalendarX } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { PublicShell } from "@/components/PublicShell"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"

import { publicEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import { PublicEventView } from "@/features/public-events/components/PublicEventView"
import { PublicRegistration } from "@/features/registrations/components/PublicRegistration"

// The registration form (S2-06, S2-07): public, no sign-in, governed by the
// registration alone, so the organizer's link works also for an unpublished event.
export const Route = createFileRoute("/e/$publicId/registration")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(publicEventQueryOptions(params.publicId)),
  component: PublicRegistrationPage,
  errorComponent: PublicRegistrationErrorPage,
})

function PublicRegistrationPage() {
  const { publicId } = Route.useParams()
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(publicId))

  return (
    <PublicShell>
      <Seo title={event?.name ?? "Akce není dostupná"} />
      {event ? (
        <PublicEventView
          publicId={publicId}
          event={event}
          registration={
            <PublicRegistration
              publicId={publicId}
              terms={event.terms}
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
    <PublicShell>
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
