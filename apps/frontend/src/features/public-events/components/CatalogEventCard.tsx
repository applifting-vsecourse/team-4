import { Link } from "@tanstack/react-router"
import { CalendarDays, MapPin, Users } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  type CatalogAvailability,
  type CatalogEvent,
} from "@/features/public-events/api/catalogSchemas"
import { formatAgeRange, formatTermCount } from "@/features/public-events/lib/catalogFilter"

const AVAILABILITY: Record<
  CatalogAvailability,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  available: { label: "Volná místa", variant: "success" },
  few: { label: "Poslední místa", variant: "warning" },
  full: { label: "Jen náhradníci", variant: "secondary" },
}

// One published event in the catalog; "Detail akce" opens its public page,
// where the registration form is (F55).
export function CatalogEventCard({ event }: { event: CatalogEvent }) {
  const availability = AVAILABILITY[event.availability]
  // The schema guarantees at least one term.
  const first = event.terms[0]!
  const last = event.terms[event.terms.length - 1]!

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <Badge variant={availability.variant}>{availability.label}</Badge>
        </div>
        <CardTitle>
          <h2 className="text-h4 break-words">{event.name}</h2>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{event.organizationName}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CalendarDays
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>
              {formatCalendarRange(first.startDate, last.endDate)}
              {event.terms.length > 1 ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {formatTermCount(event.terms.length)}
                </span>
              ) : null}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 break-words">
              {event.location}, {event.region}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Users
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>{formatAgeRange(event.ageMin, event.ageMax)}</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="justify-between">
        <p>
          <span className="text-sm text-muted-foreground">od </span>
          <span className="font-medium">{formatCzk(event.priceFromMinor)}</span>
        </p>
        <Button asChild>
          <Link
            to={ROUTES.publicEvent}
            params={{ publicId: event.publicId }}
            aria-label={`Detail akce ${event.name}`}
          >
            Detail akce
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
