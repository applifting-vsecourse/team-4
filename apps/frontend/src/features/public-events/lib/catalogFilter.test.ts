import { describe, expect, it } from "vitest"

import { type CatalogEvent } from "@/features/public-events/api/catalogSchemas"
import {
  activeFilterCount,
  catalogFilterOptions,
  filterCatalog,
  formatAgeRange,
  formatEventCount,
  formatTermCount,
} from "@/features/public-events/lib/catalogFilter"

const event = (overrides: Partial<CatalogEvent>): CatalogEvent => ({
  publicId: "x",
  name: "Akce",
  organizationName: "Org",
  location: "Brno",
  region: "Jihomoravský kraj",
  ageMin: 8,
  ageMax: 12,
  priceFromMinor: 100_00,
  availability: "available",
  terms: [{ startDate: "2027-07-04", endDate: "2027-07-10" }],
  ...overrides,
})

const kids = event({ publicId: "kids", ageMin: 6, ageMax: 10 })
const teens = event({
  publicId: "teens",
  ageMin: 13,
  ageMax: 17,
  region: "Praha",
  terms: [{ startDate: "2027-08-01", endDate: "2027-08-07" }],
})
const adults = event({
  publicId: "adults",
  ageMin: 18,
  ageMax: null,
  region: "Praha",
  terms: [
    { startDate: "2027-07-20", endDate: "2027-07-25" },
    { startDate: "2027-09-01", endDate: "2027-09-05" },
  ],
})
const all = [kids, teens, adults]
const ids = (events: CatalogEvent[]) => events.map((e) => e.publicId)

describe("filterCatalog", () => {
  it("returns everything without filters", () => {
    expect(ids(filterCatalog(all, {}))).toEqual(["kids", "teens", "adults"])
  })

  it("matches a month when any term starts in it", () => {
    expect(ids(filterCatalog(all, { month: "2027-09" }))).toEqual(["adults"])
    expect(ids(filterCatalog(all, { month: "2027-07" }))).toEqual(["kids", "adults"])
  })

  it("matches the region", () => {
    expect(ids(filterCatalog(all, { region: "Praha" }))).toEqual(["teens", "adults"])
  })

  it("matches an age group that overlaps the event's age range", () => {
    expect(ids(filterCatalog(all, { ageGroup: "11-14" }))).toEqual(["teens"])
    expect(ids(filterCatalog(all, { ageGroup: "adult" }))).toEqual(["adults"])
  })

  it("combines all active filters", () => {
    expect(ids(filterCatalog(all, { region: "Praha", month: "2027-07" }))).toEqual(["adults"])
    expect(filterCatalog(all, { region: "Praha", ageGroup: "6-10" })).toEqual([])
  })
})

describe("catalogFilterOptions", () => {
  it("offers sorted months of term starts and sorted regions", () => {
    expect(catalogFilterOptions(all)).toEqual({
      months: [
        { value: "2027-07", label: "červenec 2027" },
        { value: "2027-08", label: "srpen 2027" },
        { value: "2027-09", label: "září 2027" },
      ],
      regions: ["Jihomoravský kraj", "Praha"],
    })
  })
})

describe("activeFilterCount", () => {
  it("counts set filters only", () => {
    expect(activeFilterCount({})).toBe(0)
    expect(activeFilterCount({ region: "Praha", ageGroup: "adult" })).toBe(2)
  })
})

describe("formatEventCount", () => {
  it.each([
    [0, "0 akcí"],
    [1, "1 akce"],
    [3, "3 akce"],
    [5, "5 akcí"],
  ])("%i → %s", (count, text) => {
    expect(formatEventCount(count)).toBe(text)
  })
})

describe("formatAgeRange", () => {
  it("formats bounded and open ranges", () => {
    expect(formatAgeRange(8, 14)).toBe("8–14 let")
    expect(formatAgeRange(18, null)).toBe("od 18 let")
  })
})

describe("formatTermCount", () => {
  it.each([
    [1, "1 termín"],
    [2, "2 termíny"],
    [5, "5 termínů"],
  ])("%i → %s", (count, text) => {
    expect(formatTermCount(count)).toBe(text)
  })
})
