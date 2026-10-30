import { Badge } from "@/components/ui/badge"

export type HistoryPayment = {
  id: string
  /** Already formatted, e.g. "28. 10. 2026". */
  date: string
  /** Already formatted, e.g. "1 000 Kč". */
  amount: string
  /** Simulated payment, as opposed to a bank transfer or an organizer's entry. */
  isSimulated: boolean
}

// Přijaté platby (F21-1): a simulated payment is marked, the others are not.
export function SimulatedPaymentHistory({ payments }: { payments: HistoryPayment[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Zatím nebyla zaznamenána žádná platba.</p>
  }
  return (
    <ul className="divide-y divide-border text-sm">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
        >
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">{payment.date}</span>
            {payment.isSimulated ? <Badge variant="secondary">Simulovaná platba</Badge> : null}
          </span>
          <span className="font-mono">{payment.amount}</span>
        </li>
      ))}
    </ul>
  )
}
