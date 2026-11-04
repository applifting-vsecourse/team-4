import { describe, expect, it } from "vitest"

import { toCatalogEventItem } from "@/features/public-events/lib/catalogList"

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const item = {
  publicId: "abc123",
  name: "Tábor",
  organizationName: "Spolek",
  location: "Hlinsko",
  coverPhotoId: null,
  terms: [
    { id: uuid(1), label: "Turnus 1", startDate: "2027-07-04", endDate: "2027-07-17" },
    { id: uuid(2), label: "Turnus 2", startDate: "2027-08-01", endDate: "2027-08-14" },
  ],
}

describe("toCatalogEventItem", () => {
  it("labels each term when there are several", () => {
    expect(toCatalogEventItem(item).terms).toEqual([
      "Turnus 1: 4. 7. – 17. 7. 2027",
      "Turnus 2: 1. 8. – 14. 8. 2027",
    ])
  })

  it("leaves a single term unlabelled and an event without terms empty", () => {
    expect(toCatalogEventItem({ ...item, terms: item.terms.slice(0, 1) }).terms).toEqual([
      "4. 7. – 17. 7. 2027",
    ])
    expect(toCatalogEventItem({ ...item, terms: [] }).terms).toEqual([])
  })

  it("uses the public photo URL of the cover, or none", () => {
    expect(toCatalogEventItem(item).imageUrl).toBeNull()
    expect(toCatalogEventItem({ ...item, coverPhotoId: uuid(9) }).imageUrl).toMatch(
      new RegExp(`/public/catalog/events/abc123/photos/${uuid(9)}$`),
    )
  })
})
