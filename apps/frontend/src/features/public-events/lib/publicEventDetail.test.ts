import { describe, expect, it } from "vitest"

import { type CatalogEvent } from "@/features/public-events/api/publicEventSchemas"
import { toPublicEventDetail } from "@/features/public-events/lib/publicEventDetail"

const EVENT: CatalogEvent = {
  name: "Letní tábor",
  organizationName: "Spolek Modrá Hora",
  description: "Týden v lesích.",
  location: "Podlesí",
  conditions: "Věk 11 až 15 let.\n\n  Záloha do 7 dnů.  \n",
  contact: { name: "Jana", email: "jana@example.test", phone: "+420604123456" },
  photos: [{ id: "0190c0de-0000-7000-8000-000000000401" }],
  registrationStatus: "open",
  terms: [
    {
      id: "0190c0de-0000-7000-8000-000000000101",
      label: "Turnus 1",
      startDate: "2027-07-04",
      endDate: "2027-07-17",
      priceMinor: 790_000,
    },
  ],
}

describe("toPublicEventDetail", () => {
  it("formats terms with their own prices, conditions per line and the contact", () => {
    const detail = toPublicEventDetail("abc", EVENT)
    expect(detail.terms).toEqual([
      expect.objectContaining({ label: "Turnus 1", dates: "4. 7. – 17. 7. 2027" }),
    ])
    expect(detail.terms[0]!.price.replace(/\s/g, " ")).toBe("7 900 Kč")
    expect(detail.conditions).toEqual(["Věk 11 až 15 let.", "Záloha do 7 dnů."])
    expect(detail.contact).toEqual({
      name: "Jana",
      email: "jana@example.test",
      phone: "+420 604 123 456",
    })
    expect(detail.photos[0]!.src).toMatch(
      /\/public\/catalog\/events\/abc\/photos\/0190c0de-0000-7000-8000-000000000401$/,
    )
  })

  it("invents nothing for a missing contact, phone, photos or conditions", () => {
    const detail = toPublicEventDetail("abc", {
      ...EVENT,
      contact: null,
      photos: [],
      conditions: "",
    })
    expect(detail.contact).toBeNull()
    expect(detail.photos).toEqual([])
    expect(detail.conditions).toEqual([])
    expect(
      toPublicEventDetail("abc", { ...EVENT, contact: { ...EVENT.contact!, phone: null } }).contact
        ?.phone,
    ).toBeUndefined()
  })

  it("explains registration that is not open, closed or without terms", () => {
    expect(toPublicEventDetail("abc", { ...EVENT, registrationStatus: "not-open" })).toMatchObject({
      registrationStatus: "not-open",
    })
    expect(toPublicEventDetail("abc", { ...EVENT, terms: [] }).registrationStatus).toBe("no-terms")
    expect(
      toPublicEventDetail("abc", { ...EVENT, terms: [], registrationStatus: "closed" })
        .registrationStatus,
    ).toBe("closed")
  })
})
