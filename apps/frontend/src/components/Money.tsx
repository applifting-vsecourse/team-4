import { formatCzk } from "@/lib/money"
import { cn } from "@/lib/utils"

type MoneyProps = {
  /** In haléře, e.g. 240000 for 2 400 Kč. */
  minor: number
  /** The total of an overview, e.g. what is left to pay. */
  isEmphasised?: boolean
}

// An amount in CZK; digits of equal width keep a column of amounts aligned.
export function Money({ minor, isEmphasised = false }: MoneyProps) {
  return (
    <span className={cn("font-mono tabular-nums", isEmphasised && "font-medium")}>
      {formatCzk(minor)}
    </span>
  )
}
