import { describe, expect, it } from "vitest"

import { normalizeSearch } from "@/lib/search"

describe("normalizeSearch", () => {
  it("ignores letter case, diacritics and surrounding spaces", () => {
    expect(normalizeSearch("  Letní TÁBOR Žďár ")).toBe("letni tabor zdar")
  })

  it("treats a missing value as empty", () => {
    expect(normalizeSearch(undefined)).toBe("")
  })
})
