import { splitConditions } from "@/lib/conditions"
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
/** Shared public rule for registration availability on detail and catalog cards. */
export const getPublicEventRegistrationStatus = (
  status: CatalogEvent["registrationStatus"],
  hasTerms: boolean,
): PublicEventRegistrationStatus => {
  if (status === "closed") return "closed"
  if (!hasTerms) return "no-terms"
  return status
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
    conditions: splitConditions(event.conditions),
    contact: event.contact
      ? {
          name: event.contact.name ?? null,
          email: event.contact.email ?? null,
          phone: event.contact.phone ? formatPhone(event.contact.phone) : undefined,
        }
      : null,
    registrationStatus: getPublicEventRegistrationStatus(
      event.registrationStatus,
      event.terms.length > 0,
    ),
  }
}
