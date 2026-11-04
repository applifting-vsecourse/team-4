import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { formatPhone } from "@/lib/phone"

import { catalogPhotoUrl } from "@/features/public-events/api/publicEventQueryOptions"
import { type CatalogEvent } from "@/features/public-events/api/publicEventSchemas"
import {
  type PublicEventDetailProps,
  type PublicEventRegistrationStatus,
} from "@/features/public-events/components/PublicEventDetail"

/**
 * A closed registration says so even without terms; otherwise an event without
 * terms cannot be registered for yet, whatever its status.
 */
const registrationStatus = (event: CatalogEvent): PublicEventRegistrationStatus => {
  if (event.registrationStatus === "closed") return "closed"
  if (event.terms.length === 0) return "no-terms"
  return event.registrationStatus
}

/** The catalog detail as the page shows it: formatted, nothing invented. */
export function toPublicEventDetail(publicId: string, event: CatalogEvent): PublicEventDetailProps {
  return {
    publicId,
    name: event.name,
    organizationName: event.organizationName,
    description: event.description,
    location: event.location,
    photos: event.photos.map((photo, index) => ({
      src: catalogPhotoUrl(publicId, photo.id),
      alt: `Fotka ${index + 1} akce ${event.name}`,
    })),
    terms: event.terms.map((term) => ({
      id: term.id,
      label: term.label,
      dates: formatCalendarRange(term.startDate, term.endDate),
      price: formatCzk(term.priceMinor),
    })),
    conditions: event.conditions
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    contact: event.contact
      ? {
          name: event.contact.name,
          email: event.contact.email,
          phone: event.contact.phone ? formatPhone(event.contact.phone) : undefined,
        }
      : null,
    registrationStatus: registrationStatus(event),
  }
}
