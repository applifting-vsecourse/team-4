import { Link } from "@tanstack/react-router"
import { CalendarDays, MapPin } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export type CatalogEventItem = {
  publicId: string
  name: string
  organizationName: string
  location: string
  /** Already formatted, one entry per term. */
  terms: string[]
  ageGroup: string
}

// Veřejný katalog akcí → seznam akcí s odkazem na veřejný detail (F54-2).
// Design only: every value is passed in. Shows no capacity or private data.
export function EventCatalogList({ events }: { events: CatalogEventItem[] }) {
  return (
    <ul className="grid gap-4">
      {events.map((event) => (
        <li key={event.publicId}>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-h4 break-words">
                  <Link
                    to={ROUTES.publicEvent}
                    params={{ publicId: event.publicId }}
                    className="underline-offset-4 outline-none hover:underline focus-visible:underline"
                  >
                    {event.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{event.organizationName}</p>
              </div>
              <Badge variant="secondary">{event.ageGroup}</Badge>
            </div>
            <p className="flex items-center gap-1.5 text-sm">
              <MapPin
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 break-words">{event.location}</span>
            </p>
            <p className="flex items-start gap-1.5 text-sm">
              <CalendarDays
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 break-words">{event.terms.join(" · ")}</span>
            </p>
          </Card>
        </li>
      ))}
    </ul>
  )
}
