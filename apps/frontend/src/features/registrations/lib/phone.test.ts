import { describe, expect, it } from "vitest"

import { toE164 } from "@/features/registrations/lib/phone"

describe("toE164", () => {
  it.each([
    ["+420 777 123 456", "+420777123456"],
    ["  +420777123456 ", "+420777123456"],
    ["+421 905 123 456", "+421905123456"],
    ["+44 7911 123456", "+447911123456"],
  ])("reads %s as %s", (input, e164) => {
    expect(toE164(input)).toBe(e164)
  })

  it.each(["777 123 456", "00420 777 123 456", "+420 12", "+", ""])("refuses %j", (input) => {
    expect(toE164(input)).toBeNull()
  })
})
