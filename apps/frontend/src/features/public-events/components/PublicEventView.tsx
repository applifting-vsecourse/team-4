import type { ReactNode } from "react"
import { MapPin } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { PageHeader } from "@/components/PageHeader"

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
      <PageHeader
        title={event.name}
        description={
          <p className="flex items-center gap-1.5">
            <MapPin
              aria-hidden
              className="size-4 shrink-0"
            />
            <span className="min-w-0 break-words">{event.location}</span>
          </p>
        }
      />
      <p className="max-w-prose text-sm whitespace-pre-line">{event.description}</p>

      <section
        aria-label="Přihláška"
        className="mt-7"
      >
        {registration}
      </section>
    </article>
  )
}
