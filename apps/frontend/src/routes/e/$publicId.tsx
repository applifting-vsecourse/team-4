import type { ReactNode } from "react"
import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Seo } from "@/components/Seo"

import { publicEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import {
  PublicEventLoadError,
  PublicEventUnavailable,
  PublicEventView,
} from "@/features/public-events/components/PublicEventView"
import { PublicRegistration } from "@/features/registrations/components/PublicRegistration"

// Direct link from the organizer (S2-06): public, no sign-in, no organization.
export const Route = createFileRoute("/e/$publicId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(publicEventQueryOptions(params.publicId)),
  component: PublicEventPage,
  errorComponent: PublicEventErrorPage,
})

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <HeaderLogo />
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">{children}</div>
      </main>
    </>
  )
}

function PublicEventPage() {
  const { publicId } = Route.useParams()
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(publicId))

  return (
    <PublicShell>
      <Seo title={event?.name ?? "Akce není dostupná"} />
      {event ? (
        <PublicEventView
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
function PublicEventErrorPage() {
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
