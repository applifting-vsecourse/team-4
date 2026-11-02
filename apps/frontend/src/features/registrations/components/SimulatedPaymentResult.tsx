import { CheckCircle2, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { BalanceAmount } from "@/features/registrations/components/BalanceAmount"

export type SimulatedPaymentResultProps = {
  /** "paid": a payment was just recorded; "nothing-to-pay": the debt is settled. */
  kind: "paid" | "nothing-to-pay"
  /** Already formatted amount of the recorded payment. */
  paidAmount?: string
  /** Already formatted debt after the payment. */
  remainingDebt: string
  /** Nothing is left to pay. */
  isSettled: boolean
}

// Outcome of the public payment page (F21-1). Design only.
export function SimulatedPaymentResult({
  kind,
  paidAmount,
  remainingDebt,
  isSettled,
}: SimulatedPaymentResultProps) {
  const isPaid = kind === "paid"
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            {isPaid ? (
              <CheckCircle2
                aria-hidden
                className="size-5 text-success"
              />
            ) : (
              <Info
                aria-hidden
                className="size-5"
              />
            )}
            {isPaid ? "Platba byla přijata" : "Přihláška je uhrazená"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <dl className="space-y-2 text-sm">
            {isPaid ? (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Zaplaceno</dt>
                <dd className="font-mono">{paidAmount}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="font-medium">Zbývá zaplatit</dt>
              <dd>
                <BalanceAmount
                  amount={remainingDebt}
                  isSettled={isSettled}
                />
              </dd>
            </div>
          </dl>
          {isSettled ? null : <Button variant="outline">Zaplatit další část</Button>}
        </div>
      </CardContent>
    </Card>
  )
}
