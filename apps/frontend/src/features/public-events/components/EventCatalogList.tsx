import { Link } from "@tanstack/react-router"
import { CalendarDays, MapPin } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export type CatalogEventItem = {
  publicId: string
  name: string
  organizationName: string
  location: string
  /** Already formatted, one entry per term. */
  terms: string[]
  /** Shown only once the catalog filters by age group (F54-2b). */
  ageGroup?: string
  /** Image uploaded by the organizer; `null` shows the default image. */
  imageUrl: string | null
}

// Veřejný katalog akcí → mřížka karet akcí s odkazem na veřejný detail (F54-2).
// Every value is passed in. Shows no capacity or private data.
export function EventCatalogList({ events }: { events: CatalogEventItem[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li
          key={event.publicId}
          className="flex"
        >
          <Card
            padding="none"
            className="relative flex-1"
          >
            <EventImage imageUrl={event.imageUrl} />
            <div className="flex flex-1 flex-col gap-3 px-6 pb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-h4 break-words">
                  {/* The link covers the whole card, so the image is clickable too. */}
                  <Link
                    to={ROUTES.publicEvent}
                    params={{ publicId: event.publicId }}
                    className="underline-offset-4 outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
                  >
                    {event.name}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{event.organizationName}</p>
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
              {event.ageGroup ? (
                <div className="mt-auto pt-1">
                  <Badge variant="secondary">{event.ageGroup}</Badge>
                </div>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

// Decorative: the event name in the heading is the card's accessible name.
function EventImage({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div className="overflow-hidden rounded-t-xl">
      <AspectRatio ratio={16 / 9}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <CalendarDays
              aria-hidden
              className="size-12 text-muted-foreground"
            />
          </div>
        )}
      </AspectRatio>
    </div>
  )
}
