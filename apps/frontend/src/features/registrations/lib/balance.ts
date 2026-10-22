import { formatCzk } from "@/lib/money"

/** Due − paid as the organizer reads it: a debt, settled, or an overpayment (S2-11). */
export function describeBalance(balanceMinor: number) {
  if (balanceMinor > 0) return { label: "Dluh", amount: formatCzk(balanceMinor) }
  if (balanceMinor < 0) return { label: "Přeplatek", amount: formatCzk(-balanceMinor) }
  return { label: "Vyrovnáno", amount: null }
}
