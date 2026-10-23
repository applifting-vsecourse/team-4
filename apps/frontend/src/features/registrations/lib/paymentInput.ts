import { MAX_PRICE_MINOR } from "@/lib/money"

export type ParsedPaymentAmount =
  { minor: number; error?: never } | { minor?: never; error: string }

/**
 * Reads a received amount typed in CZK ("2 000", "600,5", "600.50") into
 * haléře with string arithmetic. It must be positive with at most two decimals
 * (S2-12), the same rules the server applies.
 */
export function parsePaymentAmount(input: string): ParsedPaymentAmount {
  const value = input.replace(/\s/g, "").replace(",", ".")
  if (value === "") return { error: "Zadejte částku." }
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) return { error: "Zadejte částku jako kladné číslo, např. 600 nebo 600,50." }
  const [, crowns = "", halere = ""] = match
  if (halere.length > 2) return { error: "Částka může mít nejvýše dvě desetinná místa." }
  const minor = Number(crowns) * 100 + Number(halere.padEnd(2, "0"))
  if (minor <= 0) return { error: "Částka musí být větší než nula." }
  if (minor > MAX_PRICE_MINOR) return { error: "Částka může být nejvýše 10 000 000 Kč." }
  return { minor }
}
