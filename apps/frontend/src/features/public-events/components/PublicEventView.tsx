import type { ReactNode } from "react"
import { MapPin } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"

import { type PublicEvent } from "@/features/public-events/api/publicEventSchemas"

// Content of an open event: name, description and place, then the
// registration form (S2-07) the route puts in. Availability is deliberately
// not shown: the server decides each term when saving (S2-08). A published
// event links back to its catalog detail (F55) above the name; the typed values survive the visit.
export function PublicEventView({
  publicId,
  event,
  registration,
}: {
  publicId: string
  event: PublicEvent
  registration: ReactNode
}) {
  return (
    <article>
      {event.isPublished ? (
        <BackLink
          to={ROUTES.publicEvent}
          params={{ publicId }}
          className="mb-6"
        >
          Zpět na detail akce
        </BackLink>
      ) : null}
      <h1 className="text-h2 break-words">{event.name}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin
          aria-hidden
          className="size-4 shrink-0"
        />
        <span className="min-w-0 break-words">{event.location}</span>
      </p>
      <p className="mt-6 max-w-prose text-sm whitespace-pre-line">{event.description}</p>

      <section
        aria-label="Přihláška"
        className="mt-7"
      >
        {registration}
      </section>
    </article>
  )
}
