import { describe, expect, it } from "vitest"

import { parsePaymentAmount } from "@/features/registrations/lib/paymentInput"

describe("parsePaymentAmount", () => {
  it.each([
    ["600", 60_000],
    ["2 000", 200_000],
    ["600,5", 60_050],
    ["600.50", 60_050],
    ["0,01", 1],
  ])("reads %s as %i haléřů", (input, minor) => {
    expect(parsePaymentAmount(input)).toEqual({ minor })
  })

  it.each([
    ["", "Zadejte částku."],
    ["0", "Částka musí být větší než nula."],
    ["0,00", "Částka musí být větší než nula."],
    ["-5", "Zadejte částku jako kladné číslo, např. 600 nebo 600,50."],
    ["abc", "Zadejte částku jako kladné číslo, např. 600 nebo 600,50."],
    ["1,234", "Částka může mít nejvýše dvě desetinná místa."],
    ["10 000 000,01", "Částka může být nejvýše 10 000 000 Kč."],
  ])("refuses %j", (input, error) => {
    expect(parsePaymentAmount(input)).toEqual({ error })
  })
})
