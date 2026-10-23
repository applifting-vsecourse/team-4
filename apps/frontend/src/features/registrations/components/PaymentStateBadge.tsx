import { Badge } from "@/components/ui/badge"

import { type PaymentState } from "@/features/registrations/api/eventRegistrationSchemas"

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  none: "Bez povinnosti",
  unpaid: "Nezaplaceno",
  partial: "Částečně zaplaceno",
  paid: "Zaplaceno",
  overpaid: "Přeplatek",
}

// No red: a reminder date is not a deadline, so nothing here is overdue
// (S2-11, PM decision of 21 October 2026).
const VARIANTS = {
  none: "secondary",
  unpaid: "outline",
  partial: "warning",
  paid: "success",
  overpaid: "secondary",
} as const satisfies Record<PaymentState, string>

export function PaymentStateBadge({ state }: { state: PaymentState }) {
  return <Badge variant={VARIANTS[state]}>{PAYMENT_STATE_LABELS[state]}</Badge>
}
