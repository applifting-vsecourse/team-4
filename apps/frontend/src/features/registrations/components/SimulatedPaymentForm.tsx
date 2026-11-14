import { Loader2 } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { Notice } from "@/components/Notice"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { BalanceAmount } from "@/features/registrations/components/BalanceAmount"

export type SimulatedPaymentFormProps = {
  eventName: string
  /** Already formatted current debt, e.g. "2 400 Kč"; absent when it failed to load. */
  debt?: string
  /** The amount as typed, e.g. "2400". */
  amount: string
  amountError?: string
  /** The debt dropped below the entered amount; a new confirmation is needed. */
  isDebtReduced?: boolean
  /** Saving or loading failed; the input stays for a retry. */
  errorMessage?: string
  /**
   * Saving, or verifying a save whose response got lost; both look the same to
   * the participant and neither allows a second payment.
   */
  isSaving?: boolean
  onAmountChange?: (amount: string) => void
  /** "Zaplatit"; not called while saving. */
  onSubmit?: () => void
  /** "Zkusit znovu" after a failure: repeats the same attempt. */
  onRetry?: () => void
}

// Public payment page opened from the QR (F21-1). Opening it creates nothing;
// only "Zaplatit" records a payment. The page never tells the participant that
// the payment is simulated.
export function SimulatedPaymentForm({
  eventName,
  debt,
  amount,
  amountError,
  isDebtReduced = false,
  errorMessage,
  isSaving = false,
  onAmountChange,
  onSubmit,
  onRetry,
}: SimulatedPaymentFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platba přihlášky</CardTitle>
        <CardDescription>{eventName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving) onSubmit?.()
          }}
        >
          {debt ? (
            <dl className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">Zbývá zaplatit</dt>
              <dd>
                <BalanceAmount
                  amount={debt}
                  isSettled={false}
                />
              </dd>
            </dl>
          ) : null}

          {isDebtReduced ? (
            <Notice
              tone="warning"
              title="Částka k úhradě se mezitím snížila"
            >
              Zkontrolujte částku a potvrďte platbu znovu.
            </Notice>
          ) : null}

          {errorMessage ? (
            <LoadError
              title="Akce se nepodařila"
              description={errorMessage}
              isRetrying={isSaving}
              onRetry={onRetry}
            />
          ) : null}

          {debt ? (
            <>
              <Field data-invalid={amountError ? true : undefined}>
                <FieldLabel htmlFor="payment-amount">Částka (Kč)</FieldLabel>
                <Input
                  id="payment-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => onAmountChange?.(event.target.value)}
                  aria-invalid={amountError ? true : undefined}
                  aria-describedby={amountError ? "payment-amount-error" : undefined}
                  disabled={isSaving}
                />
                <FieldError id="payment-amount-error">{amountError}</FieldError>
              </Field>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : null}
                Zaplatit
              </Button>
            </>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
