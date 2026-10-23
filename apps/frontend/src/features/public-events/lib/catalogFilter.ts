import { type CatalogEvent } from "@/features/public-events/api/catalogSchemas"

export const AGE_GROUPS = [
  { id: "6-10", label: "6–10 let", min: 6, max: 10 },
  { id: "11-14", label: "11–14 let", min: 11, max: 14 },
  { id: "15-17", label: "15–17 let", min: 15, max: 17 },
  { id: "adult", label: "Dospělí 18+", min: 18, max: null },
] as const

export type AgeGroupId = (typeof AGE_GROUPS)[number]["id"]

/** Active catalog filters; an unset key means "any". */
export type CatalogFilter = {
  /** `YYYY-MM` in which at least one term starts. */
  month?: string
  region?: string
  ageGroup?: AgeGroupId
}

const monthOf = (date: string) => date.slice(0, 7)

const monthLabel = new Intl.DateTimeFormat("cs-CZ", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export function formatMonth(month: string) {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number)
  return monthLabel.format(new Date(Date.UTC(year, monthNumber - 1, 1)))
}

function overlapsAgeGroup(event: CatalogEvent, groupId: AgeGroupId) {
  const group = AGE_GROUPS.find((candidate) => candidate.id === groupId)
  if (!group) return true
  const eventMax = event.ageMax ?? Infinity
  const groupMax = group.max ?? Infinity
  return event.ageMin <= groupMax && eventMax >= group.min
}

export function filterCatalog(events: CatalogEvent[], filter: CatalogFilter) {
  return events.filter(
    (event) =>
      (!filter.month || event.terms.some((term) => monthOf(term.startDate) === filter.month)) &&
      (!filter.region || event.region === filter.region) &&
      (!filter.ageGroup || overlapsAgeGroup(event, filter.ageGroup)),
  )
}

export function catalogFilterOptions(events: CatalogEvent[]) {
  const months = [...new Set(events.flatMap((e) => e.terms.map((t) => monthOf(t.startDate))))]
  const regions = [...new Set(events.map((e) => e.region))]
  return {
    months: months.sort().map((value) => ({ value, label: formatMonth(value) })),
    regions: regions.sort((a, b) => a.localeCompare(b, "cs")),
  }
}

export function activeFilterCount(filter: CatalogFilter) {
  return Object.values(filter).filter(Boolean).length
}

export function formatEventCount(count: number) {
  if (count === 1) return "1 akce"
  if (count >= 2 && count <= 4) return `${count} akce`
  return `${count} akcí`
}

export function formatAgeRange(min: number, max: number | null) {
  return max === null ? `od ${min} let` : `${min}–${max} let`
}

export function formatTermCount(count: number) {
  if (count === 1) return "1 termín"
  if (count >= 2 && count <= 4) return `${count} termíny`
  return `${count} termínů`
}
