import type { ReactNode } from "react"
import { CalendarX, MapPin } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

import { type PublicEvent } from "@/features/public-events/api/publicEventSchemas"

// Wireframy V1: a draft and an unknown event, with no data of any event.
export function PublicEventUnavailable() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>Akce není dostupná</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

/** The event could not be loaded; different from an unavailable one. */
export function PublicEventLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
      <AlertDescription>
        <p>Zkontrolujte připojení a zkuste to znovu.</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={onRetry}
        >
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// Content of an open event: name, description and place, then the
// registration form (S2-07) the route puts in. Availability is deliberately
// not shown: the server decides each term when saving (S2-08).
export function PublicEventView({
  event,
  registration,
}: {
  event: PublicEvent
  registration: ReactNode
}) {
  return (
    <article>
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
        className="mt-7 max-w-2xl"
      >
        {registration}
      </section>
    </article>
  )
}
