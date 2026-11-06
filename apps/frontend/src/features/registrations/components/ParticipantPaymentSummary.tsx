import type { ReactNode } from "react"

import { formatPragueDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { cn } from "@/lib/utils"

import { type PaymentInstructions } from "@/features/registrations/api/registrationSchemas"
import { BalanceAmount } from "@/features/registrations/components/BalanceAmount"
import { formatBankAccount } from "@/features/registrations/lib/bankAccount"

type ParticipantPaymentSummaryProps = {
  selectedPriceMinor: number
  amountDueMinor: number
  paidMinor: number
  balanceMinor: number
  /** Present only while a debt remains. */
  instructions: PaymentInstructions | null
  /** The list shows the reminder date only; the account and VS belong to the detail. */
  shouldShowAccount?: boolean
  /** Moves "Zbývá zaplatit" last as a coloured, bold total (F21-1 design). */
  isBalanceHighlighted?: boolean
}

// The price of the selection, what the confirmed terms owe, what was received
// and what is left. With nothing owed there is no request to pay and no
// reminder date (S2-14, S2-16). Payment never changes who is confirmed.
export function ParticipantPaymentSummary({
  selectedPriceMinor,
  amountDueMinor,
  paidMinor,
  balanceMinor,
  instructions,
  shouldShowAccount = true,
  isBalanceHighlighted = false,
}: ParticipantPaymentSummaryProps) {
  const hasObligation = amountDueMinor > 0

  return (
    <div className="space-y-3">
      <dl className="space-y-2 text-sm">
        <Row label="Cena výběru">
          <Amount minor={selectedPriceMinor} />
        </Row>
        {hasObligation ? (
          <>
            <Row label="K úhradě za potvrzené termíny">
              <Amount minor={amountDueMinor} />
            </Row>
            <Row label="Zaplaceno">
              <Amount minor={paidMinor} />
            </Row>
            {isBalanceHighlighted ? null : (
              <Row label="Zbývá zaplatit">
                <Amount
                  minor={Math.max(balanceMinor, 0)}
                  className="font-medium"
                />
              </Row>
            )}
            {balanceMinor < 0 ? (
              <Row label="Přeplatek">
                <Amount minor={-balanceMinor} />
              </Row>
            ) : null}
            {isBalanceHighlighted ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-2">
                <dt className="font-medium">Zbývá zaplatit</dt>
                <dd className="text-right">
                  <BalanceAmount
                    amount={formatCzk(Math.max(balanceMinor, 0))}
                    isSettled={balanceMinor <= 0}
                  />
                </dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>

      {hasObligation ? null : (
        <p className="text-sm text-muted-foreground">
          {selectedPriceMinor === 0
            ? "Účast je zdarma, nic neplatíte."
            : "Nyní nemáte platební povinnost."}
        </p>
      )}

      {instructions ? (
        <dl className="space-y-2 border-t border-border pt-3 text-sm">
          <Row label="Datum připomenutí platby">
            {formatPragueDate(instructions.reminderAt)} (Europe/Prague)
          </Row>
          {shouldShowAccount ? (
            <>
              <Row label="Číslo účtu">
                <span className="font-mono">{formatBankAccount(instructions.account)}</span>
              </Row>
              <Row label="Variabilní symbol">
                <span className="font-mono">{instructions.variableSymbol}</span>
              </Row>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function Amount({ minor, className }: { minor: number; className?: string }) {
  return <span className={cn("font-mono", className)}>{formatCzk(minor)}</span>
}
