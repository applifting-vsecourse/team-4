import { CheckCircle2, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type SimulatedPaymentResultProps = {
  /** "paid": a payment was just recorded; "nothing-to-pay": the debt is settled. */
  kind: "paid" | "nothing-to-pay"
  /** Already formatted amount of the recorded payment. */
  paidAmount?: string
  /** Already formatted debt after the payment. */
  remainingDebt: string
}

// Outcome of the public simulation page (F21-1). Design only.
export function SimulatedPaymentResult({
  kind,
  paidAmount,
  remainingDebt,
}: SimulatedPaymentResultProps) {
  const isPaid = kind === "paid"
  const isSettled = remainingDebt === "0 Kč"
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>
            <span className="flex items-center gap-2">
              {isPaid ? (
                <CheckCircle2
                  aria-hidden
                  className="size-5"
                />
              ) : (
                <Info
                  aria-hidden
                  className="size-5"
                />
              )}
              {isPaid ? "Simulovaná platba byla přijata" : "Není co hradit"}
            </span>
          </CardTitle>
          <Badge variant="secondary">Simulace</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-sm">
            {isPaid
              ? "Žádné peníze se nepřevedly, platba je jen zaznamenaná jako simulovaná."
              : "Tato přihláška nemá žádný nedoplatek, další platbu nelze přidat."}
          </p>
          <dl className="space-y-2 text-sm">
            {isPaid ? (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Uhrazeno</dt>
                <dd className="font-mono">{paidAmount}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Zbývá zaplatit</dt>
              <dd className="font-mono font-medium">{remainingDebt}</dd>
            </div>
          </dl>
          {isPaid && !isSettled ? <Button variant="outline">Uhradit další část</Button> : null}
        </div>
      </CardContent>
    </Card>
  )
}
