import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"

import { PublicShell } from "@/components/PublicShell"
import { Seo } from "@/components/Seo"

import { publicEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import {
  PublicEventLoadError,
  PublicEventUnavailable,
  PublicEventView,
} from "@/features/public-events/components/PublicEventView"
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
        <PublicEventUnavailable />
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
      <PublicEventLoadError
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </PublicShell>
  )
}
