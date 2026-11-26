import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { Money } from "@/components/Money"
import { formatPragueDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type ParticipantTerm } from "@/features/registrations/api/participantRegistrationSchemas"
import { type PaymentInstructions } from "@/features/registrations/api/registrationSchemas"
import { BalanceRow } from "@/features/registrations/components/BalanceRow"
import { formatBankAccount } from "@/features/registrations/lib/bankAccount"
import { paymentOverview } from "@/features/registrations/lib/paymentOverview"

type ParticipantPaymentSummaryProps = {
  terms: Pick<ParticipantTerm, "status">[]
  selectedPriceMinor: number
  amountDueMinor: number
  paidMinor: number
  /** Present only while a debt remains. */
  instructions: PaymentInstructions | null
  /** The list shows the reminder date only; the account and VS belong to the detail. */
  shouldShowAccount?: boolean
}

// Before any confirmation the selected price is only preliminary; afterwards
// the summary counts the confirmed terms alone. Waiting and waitlisted terms
// create no payment obligation until they are confirmed (S5-02).
export function ParticipantPaymentSummary({
  terms,
  selectedPriceMinor,
  amountDueMinor,
  paidMinor,
  instructions,
  shouldShowAccount = true,
}: ParticipantPaymentSummaryProps) {
  const overview = paymentOverview({ terms, selectedPriceMinor, amountDueMinor, paidMinor })

  return (
    <div className="space-y-3">
      {overview.kind === "cancelled" ? <p className="text-sm font-medium">Účast zrušena</p> : null}

      {overview.kind === "preliminary" ? (
        <>
          <DefinitionList>
            <DefinitionRow label="Předběžná cena vybraných termínů">
              <Money minor={overview.priceMinor} />
            </DefinitionRow>
          </DefinitionList>
          <p className="text-sm font-medium">
            {overview.priceMinor === 0
              ? "Účast je zdarma, po potvrzení nic neplatíte."
              : "Zatím nic neplaťte. Platit budete až za termíny, které organizátor potvrdí."}
          </p>
        </>
      ) : null}

      {overview.kind === "confirmed" && overview.dueMinor === 0 && overview.paidMinor === 0 ? (
        <p className="text-sm font-medium">Potvrzená účast je zdarma, nic neplatíte.</p>
      ) : null}

      {overview.kind === "confirmed" && (overview.dueMinor > 0 || overview.paidMinor > 0) ? (
        <DefinitionList>
          <DefinitionRow label="Cena potvrzených termínů">
            <Money minor={overview.dueMinor} />
          </DefinitionRow>
          <DefinitionRow label="Zaplaceno">
            <Money minor={overview.paidMinor} />
          </DefinitionRow>
          {overview.overpaidMinor > 0 ? (
            <DefinitionRow
              label="Přeplatek"
              isEmphasised
            >
              <Money
                minor={overview.overpaidMinor}
                isEmphasised
              />
            </DefinitionRow>
          ) : (
            <BalanceRow
              amount={formatCzk(overview.remainingMinor)}
              isSettled={overview.remainingMinor === 0}
            />
          )}
        </DefinitionList>
      ) : null}

      {overview.kind === "cancelled" && overview.overpaidMinor > 0 ? (
        <DefinitionList>
          <DefinitionRow label="Přeplatek">
            <Money
              minor={overview.overpaidMinor}
              isEmphasised
            />
          </DefinitionRow>
        </DefinitionList>
      ) : null}

      {overview.kind !== "preliminary" && overview.overpaidMinor > 0 ? (
        <p className="text-sm text-muted-foreground">
          O naložení s přeplatkem se domluvte s organizátorem. Další platba není potřeba.
        </p>
      ) : null}

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
