import { describe, expect, it } from "vitest"

import { parseQrAmount } from "@/features/registrations/lib/qrPayment"

describe("parseQrAmount", () => {
  it("accepts the whole debt and a smaller part", () => {
    expect(parseQrAmount("2400", 240_000)).toEqual({ minor: 240_000 })
    expect(parseQrAmount("1 000,50", 240_000)).toEqual({ minor: 100_050 })
  })

  it("rejects empty, non-numeric, zero, negative and over-precise input", () => {
    for (const input of ["", "abc", "0", "-5", "12,345"]) {
      expect(parseQrAmount(input, 240_000).error).toBeTruthy()
    }
  })

  it("rejects more than the debt and names the debt", () => {
    const result = parseQrAmount("2400,01", 240_000)
    expect(result.error?.replace(/\u00a0/g, " ")).toBe(
      "Částka je vyšší než zbývá zaplatit (2 400 Kč).",
    )
  })
})
