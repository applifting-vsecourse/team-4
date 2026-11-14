import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { formatPragueDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { cn } from "@/lib/utils"

import { type PaymentInstructions } from "@/features/registrations/api/registrationSchemas"
import { BalanceRow } from "@/features/registrations/components/BalanceRow"
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
      <DefinitionList>
        <DefinitionRow label="Cena výběru">
          <Amount minor={selectedPriceMinor} />
        </DefinitionRow>
        {hasObligation ? (
          <>
            <DefinitionRow label="K úhradě za potvrzené termíny">
              <Amount minor={amountDueMinor} />
            </DefinitionRow>
            <DefinitionRow label="Zaplaceno">
              <Amount minor={paidMinor} />
            </DefinitionRow>
            {isBalanceHighlighted ? null : (
              <DefinitionRow label="Zbývá zaplatit">
                <Amount
                  minor={Math.max(balanceMinor, 0)}
                  className="font-medium"
                />
              </DefinitionRow>
            )}
            {balanceMinor < 0 ? (
              <DefinitionRow label="Přeplatek">
                <Amount minor={-balanceMinor} />
              </DefinitionRow>
            ) : null}
            {isBalanceHighlighted ? (
              <BalanceRow
                amount={formatCzk(Math.max(balanceMinor, 0))}
                isSettled={balanceMinor <= 0}
              />
            ) : null}
          </>
        ) : null}
      </DefinitionList>

      {hasObligation ? null : (
        <p className="text-sm text-muted-foreground">
          {selectedPriceMinor === 0
            ? "Účast je zdarma, nic neplatíte."
            : "Nyní nemáte platební povinnost."}
        </p>
      )}

      {instructions ? (
        <DefinitionList className="border-t border-border pt-3">
          <DefinitionRow label="Datum připomenutí platby">
            {formatPragueDate(instructions.reminderAt)}
          </DefinitionRow>
          {shouldShowAccount ? (
            <>
              <DefinitionRow label="Číslo účtu">
                <span className="font-mono">{formatBankAccount(instructions.account)}</span>
              </DefinitionRow>
              <DefinitionRow label="Variabilní symbol">
                <span className="font-mono">{instructions.variableSymbol}</span>
              </DefinitionRow>
            </>
          ) : null}
        </DefinitionList>
      ) : null}
    </div>
  )
}

function Amount({ minor, className }: { minor: number; className?: string }) {
  return <span className={cn("font-mono tabular-nums", className)}>{formatCzk(minor)}</span>
}
