import { formatCalendarRange } from "@/lib/date"

import { catalogPhotoUrl } from "@/features/public-events/api/publicEventQueryOptions"
import { type CatalogItem } from "@/features/public-events/api/publicEventSchemas"
import { type CatalogEventItem } from "@/features/public-events/components/EventCatalogList"

/**
 * A catalog item as the card shows it. The term label is shown only when there
 * are several terms to tell apart; the API order (by start date) is kept.
 */
export function toCatalogEventItem(item: CatalogItem): CatalogEventItem {
  return {
    publicId: item.publicId,
    name: item.name,
    organizationName: item.organizationName,
    location: item.location,
    terms: item.terms.map((term) => {
      const dates = formatCalendarRange(term.startDate, term.endDate)
      return item.terms.length > 1 ? `${term.label}: ${dates}` : dates
    }),
    imageUrl: item.coverPhotoId ? catalogPhotoUrl(item.publicId, item.coverPhotoId) : null,
  }
}

/** How many catalog events the landing page previews. */
export const CATALOG_PREVIEW_SIZE = 3

/** The landing preview: the soonest events, as the API orders them. */
export function toCatalogPreview(items: CatalogItem[]): CatalogEventItem[] {
  return items.slice(0, CATALOG_PREVIEW_SIZE).map(toCatalogEventItem)
}
