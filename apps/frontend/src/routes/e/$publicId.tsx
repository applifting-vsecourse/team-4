import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Seo } from "@/components/Seo"

import { publicEventQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import {
  PublicEventUnavailable,
  PublicEventView,
} from "@/features/public-events/components/PublicEventView"

// Direct link from the organizer (S2-06): public, no sign-in, no organization.
export const Route = createFileRoute("/e/$publicId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(publicEventQueryOptions(params.publicId)),
  component: PublicEventPage,
})

function PublicEventPage() {
  const { publicId } = Route.useParams()
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(publicId))

  return (
    <>
      <Seo title={event?.name ?? "Akce není dostupná"} />
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <HeaderLogo />
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
          {event ? <PublicEventView event={event} /> : <PublicEventUnavailable />}
        </div>
      </main>
    </>
  )
}
