import { CheckCircle2, Info } from "lucide-react"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { BalanceRow } from "@/features/registrations/components/BalanceRow"

export type SimulatedPaymentResultProps = {
  /** "paid": a payment was just recorded; "nothing-to-pay": the debt is settled. */
  kind: "paid" | "nothing-to-pay"
  /** Already formatted amount of the recorded payment. */
  paidAmount?: string
  /** Already formatted debt after the payment. */
  remainingDebt: string
  /** Nothing is left to pay. */
  isSettled: boolean
  /** "Zaplatit další část": back to the payment form. */
  onPayMore?: () => void
}

// Outcome of the public payment page (F21-1).
export function SimulatedPaymentResult({
  kind,
  paidAmount,
  remainingDebt,
  isSettled,
  onPayMore,
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
          <DefinitionList>
            {isPaid ? (
              <DefinitionRow label="Zaplaceno">
                <span className="font-mono">{paidAmount}</span>
              </DefinitionRow>
            ) : null}
            <BalanceRow
              amount={remainingDebt}
              isSettled={isSettled}
            />
          </DefinitionList>
          {isSettled ? null : (
            <Button
              variant="secondary"
              onClick={onPayMore}
            >
              Zaplatit další část
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
