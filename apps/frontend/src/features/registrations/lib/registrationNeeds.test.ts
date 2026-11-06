import { describe, expect, it } from "vitest"

import { NO_NEEDS } from "@/features/registrations/api/registrationSchemas"
import {
  formatDiet,
  formatHealth,
  formatTransport,
  validateNeeds,
} from "@/features/registrations/lib/registrationNeeds"

describe("validateNeeds", () => {
  it("accepts needs left empty", () => {
    expect(validateNeeds(NO_NEEDS)).toEqual({})
  })

  it("puts each limit at its own field, counting the trimmed text", () => {
    expect(
      validateNeeds({
        ...NO_NEEDS,
        transportNote: `${"x".repeat(500)}   `,
        dietNote: "x".repeat(501),
        health: "x".repeat(2001),
      }),
    ).toEqual({
      dietNote: "Vlastní text ke stravě může mít nejvýše 500 znaků.",
      health: "Zdravotní omezení mohou mít nejvýše 2000 znaků.",
    })
  })

  it("refuses “Bez omezení” together with a diet choice", () => {
    expect(validateNeeds({ ...NO_NEEDS, hasNoDietRestriction: true, diet: ["vegan"] })).toEqual({
      diet: "„Bez omezení“ nejde vybrat spolu s jinou volbou stravy.",
    })
  })
})

describe("formatting for the detail and the change summary", () => {
  it("reads “Neuvedeno” for empty parts, never “Bez omezení”", () => {
    expect([formatTransport(NO_NEEDS), formatDiet(NO_NEEDS), formatHealth(NO_NEEDS)]).toEqual([
      "Neuvedeno",
      "Neuvedeno",
      "Neuvedeno",
    ])
  })

  it("keeps the choice and the note apart", () => {
    const needs = {
      ...NO_NEEDS,
      transport: "shared" as const,
      transportNote: "Z Pardubic",
      diet: ["vegetarian" as const, "lactose_free" as const],
      dietNote: "Bez ořechů",
    }
    expect(formatTransport(needs)).toBe("Společná doprava · Z Pardubic")
    expect(formatDiet(needs)).toBe("Vegetariánská, Bezlaktózová · Bez ořechů")
    expect(formatDiet({ ...NO_NEEDS, hasNoDietRestriction: true })).toBe("Bez omezení")
    expect(formatTransport({ ...NO_NEEDS, transportNote: "Odvezou rodiče" })).toBe("Odvezou rodiče")
  })
})
