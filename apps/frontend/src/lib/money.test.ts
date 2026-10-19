import { describe, expect, it } from "vitest"

import { formatCzk, minorToInput, parseCzkToMinor } from "@/lib/money"

describe("parseCzkToMinor", () => {
  it.each([
    ["0", 0],
    ["7900", 790000],
    ["7 900", 790000],
    ["7900,5", 790050],
    ["7900.05", 790005],
    ["0,01", 1],
    ["19,99", 1999],
  ])("reads %j as %i haléřů", (input, minor) => {
    expect(parseCzkToMinor(input)).toEqual({ minor })
  })

  it.each([
    ["", "Zadejte cenu."],
    ["  ", "Zadejte cenu."],
    ["-500", "Cena nesmí být záporná."],
    ["10,001", "Cena může mít nejvýše dvě desetinná místa."],
    ["abc", "Zadejte cenu jako číslo, např. 7900 nebo 7900,50."],
    ["1e3", "Zadejte cenu jako číslo, např. 7900 nebo 7900,50."],
    ["10000000,01", "Cena může být nejvýše 10 000 000 Kč."],
  ])("rejects %j", (input, error) => {
    expect(parseCzkToMinor(input)).toEqual({ error })
  })
})

describe("formatCzk", () => {
  it("leaves out haléře only when there are none", () => {
    expect(formatCzk(790000).replace(/\s/g, " ")).toBe("7 900 Kč")
    expect(formatCzk(790050).replace(/\s/g, " ")).toBe("7 900,50 Kč")
    expect(formatCzk(0).replace(/\s/g, " ")).toBe("0 Kč")
  })
})

describe("minorToInput", () => {
  it("round-trips through the parser", () => {
    for (const minor of [0, 1, 1999, 790000, 790050]) {
      expect(parseCzkToMinor(minorToInput(minor))).toEqual({ minor })
    }
  })
})
