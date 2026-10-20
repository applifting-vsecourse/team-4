// Money travels as integer haléře (CZK × 100), never as a float
// (data-model.md §3.5). Currency is CZK by contract.

/** 10 million CZK, the backend's upper bound for one price. */
export const MAX_PRICE_MINOR = 1_000_000_000

const wholeCzk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
})

const czkWithHalere = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "7 900 Kč", or "7 900,50 Kč" when the amount has haléře. */
export function formatCzk(minor: number) {
  return (minor % 100 === 0 ? wholeCzk : czkWithHalere).format(minor / 100)
}

/** Haléře as the user types them: "7900", "7900,50". */
export function minorToInput(minor: number) {
  const crowns = Math.trunc(minor / 100)
  const halere = minor % 100
  return halere === 0 ? String(crowns) : `${crowns},${String(halere).padStart(2, "0")}`
}

export type ParsedAmount = { minor: number; error?: never } | { minor?: never; error: string }

/**
 * Reads a CZK amount typed by the user ("7 900", "7900,5", "7900.50") into
 * haléře with string arithmetic, so no float rounding can change it.
 */
export function parseCzkToMinor(input: string): ParsedAmount {
  const value = input.replace(/\s/g, "").replace(",", ".")
  if (value === "") return { error: "Zadejte cenu." }
  if (value.startsWith("-")) return { error: "Cena nesmí být záporná." }
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) return { error: "Zadejte cenu jako číslo, např. 7900 nebo 7900,50." }
  const [, crowns = "", halere = ""] = match
  if (halere.length > 2) return { error: "Cena může mít nejvýše dvě desetinná místa." }
  const minor = Number(crowns) * 100 + Number(halere.padEnd(2, "0"))
  if (minor > MAX_PRICE_MINOR) return { error: "Cena může být nejvýše 10 000 000 Kč." }
  return { minor }
}
