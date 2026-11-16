import { describe, expect, it } from "vitest"

import type { CatalogItem } from "@/features/public-events/api/publicEventSchemas"
import { filterCatalog, isCatalogFiltered } from "@/features/public-events/lib/catalogFilter"

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const event = (
  publicId: string,
  overrides: Partial<CatalogItem> & { dates?: [string, string][] } = {},
): CatalogItem => {
  const { dates = [["2027-07-04", "2027-07-17"]], ...rest } = overrides
  return {
    publicId,
    name: `Akce ${publicId}`,
    organizationName: "Spolek",
    location: "Hlinsko",
    coverPhotoId: null,
    registrationStatus: "open",
    terms: dates.map(([startDate, endDate], index) => ({
      id: uuid(index + 1),
      label: `Termín ${index + 1}`,
      startDate,
      endDate,
    })),
    ...rest,
  }
}

const ids = (items: CatalogItem[]) => items.map((item) => item.publicId)

describe("filterCatalog", () => {
  const tabor = event("tabor", { name: "Letní TÁBOR", organizationName: "Junák Brno" })
  const vikend = event("vikend", { name: "Víkend", organizationName: "Spolek Modrá Hora" })

  it("returns every event without a search or filter", () => {
    expect(ids(filterCatalog([tabor, vikend], {}))).toEqual(["tabor", "vikend"])
  })

  it("searches the event and organizer name, ignoring letter case", () => {
    expect(ids(filterCatalog([tabor, vikend], { q: "tábor" }))).toEqual(["tabor"])
    expect(ids(filterCatalog([tabor, vikend], { q: "  modrá HORA " }))).toEqual(["vikend"])
    expect(ids(filterCatalog([tabor, vikend], { q: "Hlinsko" }))).toEqual([])
  })

  it("ignores diacritics in the search and the place", () => {
    const zdar = event("zdar", { location: "Žďár nad Sázavou" })
    expect(ids(filterCatalog([tabor, vikend], { q: "letni tabor" }))).toEqual(["tabor"])
    expect(ids(filterCatalog([tabor, zdar], { place: "zdar" }))).toEqual(["zdar"])
  })

  it("matches the place within the stored location, ignoring letter case", () => {
    const praha = event("praha", { location: "DDM Praha 4, Praha" })
    expect(ids(filterCatalog([tabor, praha], { place: "praha" }))).toEqual(["praha"])
  })

  it("matches a period overlapping at least one term, both end days included", () => {
    const twoTerms = event("two", {
      dates: [
        ["2027-07-04", "2027-07-17"],
        ["2027-08-01", "2027-08-14"],
      ],
    })
    const list = [twoTerms]
    expect(ids(filterCatalog(list, { from: "2027-08-14" }))).toEqual(["two"])
    expect(ids(filterCatalog(list, { from: "2027-08-15" }))).toEqual([])
    expect(ids(filterCatalog(list, { to: "2027-07-04" }))).toEqual(["two"])
    expect(ids(filterCatalog(list, { to: "2027-07-03" }))).toEqual([])
    expect(ids(filterCatalog(list, { from: "2027-07-20", to: "2027-07-31" }))).toEqual([])
    expect(ids(filterCatalog(list, { from: "2027-07-20", to: "2027-08-01" }))).toEqual(["two"])
  })

  it("accepts the period ends in either order", () => {
    expect(ids(filterCatalog([tabor], { from: "2027-07-31", to: "2027-07-10" }))).toEqual(["tabor"])
  })

  it("leaves out an event without terms when a period is chosen", () => {
    const noTerms = event("none", { dates: [] })
    expect(ids(filterCatalog([noTerms], {}))).toEqual(["none"])
    expect(ids(filterCatalog([noTerms], { from: "2027-01-01" }))).toEqual([])
  })

  it("shows only events open for registration when asked", () => {
    const notOpen = event("not-open", { registrationStatus: "not-open" })
    const closed = event("closed", { registrationStatus: "closed" })
    expect(ids(filterCatalog([tabor, notOpen, closed], { open: true }))).toEqual(["tabor"])
  })

  it("requires the search and every active filter at once", () => {
    const closedTabor = event("closed-tabor", { name: "Tábor", registrationStatus: "closed" })
    const praha = event("praha", { name: "Tábor", location: "Praha" })
    expect(
      ids(filterCatalog([tabor, closedTabor, praha], { q: "tábor", place: "hlinsko", open: true })),
    ).toEqual(["tabor"])
  })
})

describe("isCatalogFiltered", () => {
  it("is off without values and for blank text", () => {
    expect(isCatalogFiltered({})).toBe(false)
    expect(isCatalogFiltered({ q: " ", place: "" })).toBe(false)
  })

  it("is on for any search or filter", () => {
    expect(isCatalogFiltered({ q: "x" })).toBe(true)
    expect(isCatalogFiltered({ from: "2027-01-01" })).toBe(true)
    expect(isCatalogFiltered({ place: "Praha" })).toBe(true)
    expect(isCatalogFiltered({ open: true })).toBe(true)
  })
})
