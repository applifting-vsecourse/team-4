import { formatCzk } from "@/lib/money"

import { parsePaymentAmount } from "@/features/registrations/lib/paymentInput"

export type QrAmount = { minor: number; error?: never } | { minor?: never; error: string }

/**
 * The typed amount against the current debt: positive, at most two decimals
 * and not above what is still owed. The server applies the same rules when
 * it saves.
 */
export function parseQrAmount(input: string, debtMinor: number): QrAmount {
  const parsed = parsePaymentAmount(input)
  if (parsed.error !== undefined) return { error: parsed.error }
  if (parsed.minor > debtMinor) {
    return { error: `Částka je vyšší než zbývá zaplatit (${formatCzk(debtMinor)}).` }
  }
  return { minor: parsed.minor }
}
