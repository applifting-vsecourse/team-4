import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type SimulatedPaymentFormProps = {
  eventName: string
  /** Already formatted current debt, e.g. "2 400 Kč". */
  debt: string
  /** The amount as typed, e.g. "2400". */
  amount: string
  amountError?: string
  /** The debt dropped below the entered amount; a new confirmation is needed. */
  isDebtReduced?: boolean
  /** Saving or loading failed; the input stays for a retry. */
  errorMessage?: string
  /** The result of the save is unknown and gets verified, no second payment. */
  isVerifying?: boolean
  isSaving?: boolean
}

// Public simulation page opened from the QR (F21-1). Design only: every value is
// passed in. Opening it creates nothing; only "Zaplatit" does.
export function SimulatedPaymentForm({
  eventName,
  debt,
  amount,
  amountError,
  isDebtReduced = false,
  errorMessage,
  isVerifying = false,
  isSaving = false,
}: SimulatedPaymentFormProps) {
  const isBusy = isSaving || isVerifying
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Simulace platby</CardTitle>
          <Badge variant="secondary">Simulace</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-sm">
            {eventName}. Platba je pouze simulovaná, žádné peníze se nepřevádějí.
          </p>
          <dl className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Zbývá zaplatit</dt>
            <dd className="font-mono text-base font-medium">{debt}</dd>
          </dl>

          {isDebtReduced ? (
            <Alert>
              <RefreshCw aria-hidden />
              <AlertTitle>Dluh se mezitím snížil</AlertTitle>
              <AlertDescription>
                Zadaná částka je vyšší než aktuální dluh {debt}, proto se nic neuložilo.
                Zkontrolujte částku a potvrďte ji znovu.
              </AlertDescription>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Akce se nepodařila</AlertTitle>
              <AlertDescription>
                <p>{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Zkusit znovu
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {isVerifying ? (
            <Alert role="status">
              <Loader2
                aria-hidden
                className="animate-spin"
              />
              <AlertTitle>Ověřujeme výsledek platby</AlertTitle>
              <AlertDescription>
                Odpověď nedorazila. Zjišťujeme, zda se platba uložila, aby nevznikla dvakrát.
              </AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={amountError ? true : undefined}>
            <FieldLabel htmlFor="simulated-amount">Částka (Kč)</FieldLabel>
            <Input
              id="simulated-amount"
              inputMode="decimal"
              defaultValue={amount}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? "simulated-amount-error" : undefined}
              disabled={isBusy}
            />
            <FieldError id="simulated-amount-error">{amountError}</FieldError>
          </Field>

          <Button
            className="w-full sm:w-auto"
            disabled={isBusy}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : null}
            Zaplatit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
