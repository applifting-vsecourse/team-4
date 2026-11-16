import { normalizeSearch } from "@/lib/search"

import type { CatalogFilter, CatalogItem } from "@/features/public-events/api/publicEventSchemas"

const contains = (text: string, query: string) => normalizeSearch(text).includes(query)

const hasText = (value: string | undefined) => normalizeSearch(value) !== ""

/** Whether any search or filter is on, so "Zrušit filtry" has something to clear. */
export function isCatalogFiltered(filter: CatalogFilter): boolean {
  return (
    hasText(filter.q) ||
    hasText(filter.place) ||
    filter.from !== undefined ||
    filter.to !== undefined ||
    filter.open === true
  )
}

/**
 * The published events matching the search and every active filter (F54-2b),
 * in the API order. Text matches a part of the name, organizer or place,
 * ignoring letter case and diacritics like the other searches of the app. A
 * period matches an event when at least one term overlaps it, both end days
 * included; the two ends may be picked in either order.
 */
export function filterCatalog(items: CatalogItem[], filter: CatalogFilter): CatalogItem[] {
  const query = normalizeSearch(filter.q)
  const place = normalizeSearch(filter.place)
  const [from, to] =
    filter.from && filter.to && filter.from > filter.to
      ? [filter.to, filter.from]
      : [filter.from, filter.to]

  return items.filter(
    (item) =>
      (!query || contains(item.name, query) || contains(item.organizationName, query)) &&
      (!place || contains(item.location, place)) &&
      (!filter.open || item.registrationStatus === "open") &&
      ((from === undefined && to === undefined) ||
        item.terms.some(
          (term) => (!to || term.startDate <= to) && (!from || term.endDate >= from),
        )),
  )
}
