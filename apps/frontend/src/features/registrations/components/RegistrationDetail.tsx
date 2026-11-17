import type { ReactNode } from "react"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { LoadError } from "@/components/LoadError"
import { Money } from "@/components/Money"
import { ParticipationBadge } from "@/components/ParticipationBadge"
import { RefreshButton } from "@/components/RefreshButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatCalendarDate,
  formatCalendarRange,
  formatPragueDate,
  formatPragueDateTime,
} from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type RegistrationDetail as Detail } from "@/features/registrations/api/eventRegistrationSchemas"
import { PaymentStateBadge } from "@/features/registrations/components/PaymentStateBadge"
import { SimulatedPaymentHistory } from "@/features/registrations/components/SimulatedPaymentHistory"
import { describeBalance } from "@/features/registrations/lib/balance"

type RegistrationDetailProps = {
  registration: Detail
  /** When the shown data were read from the server (ms since epoch). */
  updatedAt: number
  isRefreshing: boolean
  /** The last refresh failed; `registration` is still from the one before. */
  hasRefreshFailed: boolean
  onRefresh: () => unknown
  /** Transport, diet and health with the organizer's correction (F63). */
  needs?: ReactNode
  /** The gender answer and its correction (F64), under the contacts. */
  accommodation?: ReactNode
  /** Replaces the list of terms, e.g. with each term's proposal (S3-01). */
  terms?: ReactNode
  /** Below the terms, e.g. the history of the evaluation (S3-01). */
  history?: ReactNode
}

// The organizer's view of one registration (S2-11): contacts,
// each term with its own status, and the payment summary with the payments.
// Recording a payment (S2-12) refreshes it through the shared query key.
export function RegistrationDetail({
  registration,
  updatedAt,
  isRefreshing,
  hasRefreshFailed,
  onRefresh,
  needs,
  accommodation,
  terms,
  history,
}: RegistrationDetailProps) {
  const updated = formatPragueDateTime(new Date(updatedAt).toISOString())

  return (
    <div
      className="space-y-6"
      aria-busy={isRefreshing}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          obdržena {formatPragueDateTime(registration.receivedAt)}
          {hasRefreshFailed ? null : ` · aktualizováno ${updated}`}
        </p>
        <RefreshButton
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      </div>

      {hasRefreshFailed ? (
        <LoadError
          shownFrom={updatedAt}
          isRetrying={isRefreshing}
          onRetry={onRefresh}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Údaje účastníka</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <section aria-label="Kontaktní údaje">
              <h2 className="mb-3 text-sm font-semibold">Kontaktní údaje</h2>
              <DefinitionList>
                <DefinitionRow label="Jméno a příjmení">
                  {registration.firstName} {registration.lastName}
                </DefinitionRow>
                <DefinitionRow label="E-mail">{registration.email}</DefinitionRow>
                <DefinitionRow label="Telefon">{registration.phone}</DefinitionRow>
              </DefinitionList>
            </section>
            {accommodation}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Termíny a platby</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {terms ?? (
                <section aria-label="Termíny">
                  <h2 className="mb-3 text-sm font-semibold">Termíny</h2>
                  <ul className="divide-y divide-border text-sm">
                    {registration.terms.map((term) => (
                      <li
                        key={term.termId}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">{term.label}</p>
                          <p className="text-muted-foreground">
                            {formatCalendarRange(term.startDate, term.endDate)} ·{" "}
                            {formatCzk(term.priceMinor)}
                          </p>
                        </div>
                        <ParticipationBadge status={term.status} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <div className="border-t border-border pt-6">
                <PaymentSummary registration={registration} />
              </div>
            </div>
          </CardContent>
        </Card>

        {needs}

        {history}
      </div>
    </div>
  )
}

function PaymentSummary({ registration }: { registration: Detail }) {
  const balance = describeBalance(registration.balanceMinor)
  const hasNoObligation = registration.paymentState === "none"

  return (
    <section aria-label="Platba">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Platba</h2>
        <PaymentStateBadge state={registration.paymentState} />
      </div>
      <div className="space-y-3">
        <DefinitionList>
          <DefinitionRow label="Cena vybraných termínů">
            <Money minor={registration.selectedPriceMinor} />
          </DefinitionRow>
          <DefinitionRow label="Částka za potvrzené termíny">
            <Money minor={registration.amountDueMinor} />
          </DefinitionRow>
          <DefinitionRow label="Zaplaceno">
            <Money minor={registration.paidMinor} />
          </DefinitionRow>
          {hasNoObligation ? null : (
            <DefinitionRow label={balance.label}>
              <Money
                minor={Math.abs(registration.balanceMinor)}
                isEmphasised
              />
            </DefinitionRow>
          )}
          {registration.reminderAt ? (
            <DefinitionRow label="Datum připomenutí platby">
              {formatPragueDate(registration.reminderAt)}
            </DefinitionRow>
          ) : null}
          {registration.variableSymbol ? (
            <DefinitionRow label="Variabilní symbol">
              <span className="font-mono">{registration.variableSymbol}</span>
            </DefinitionRow>
          ) : null}
        </DefinitionList>
        {hasNoObligation ? (
          <p className="text-sm text-muted-foreground">Bez platební povinnosti</p>
        ) : null}
      </div>
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Přijaté platby</h3>
        <SimulatedPaymentHistory
          payments={registration.payments.map((payment) => ({
            id: payment.id,
            date: formatCalendarDate(payment.receivedOn),
            amount: formatCzk(payment.amountMinor),
            isSimulated: payment.source === "qr_link",
          }))}
        />
      </div>
    </section>
  )
}
