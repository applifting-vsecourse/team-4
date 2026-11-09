import { cn } from "@/lib/utils"

export type BalanceAmountProps = {
  /** Already formatted amount, e.g. "2 400 Kč". */
  amount: string
  /** Nothing left to pay (zero or overpaid) turns green; a remaining debt is red. */
  isSettled: boolean
}

// The "Zbývá zaplatit" amount, emphasised as the most important number of a
// payment overview (F21-1). Design only: the amount comes formatted.
export function BalanceAmount({ amount, isSettled }: BalanceAmountProps) {
  return (
    <span
      className={cn(
        "font-mono text-lg font-semibold tabular-nums",
        isSettled ? "text-success" : "text-destructive",
      )}
    >
      {amount}
    </span>
  )
}
