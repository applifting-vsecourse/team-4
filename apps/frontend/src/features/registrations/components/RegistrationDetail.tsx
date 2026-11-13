import type { ReactNode } from "react"

import { LoadError } from "@/components/LoadError"
import { RefreshButton } from "@/components/RefreshButton"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatCalendarDate,
  formatCalendarRange,
  formatPragueDate,
  formatPragueDateTime,
} from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type RegistrationDetail as Detail } from "@/features/registrations/api/eventRegistrationSchemas"
import { ParticipationBadge } from "@/features/registrations/components/ParticipationBadge"
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontaktní údaje</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Jméno a příjmení">
                  {registration.firstName} {registration.lastName}
                </Row>
                <Row label="E-mail">{registration.email}</Row>
                <Row label="Telefon">{registration.phone}</Row>
              </dl>
            </CardContent>
          </Card>

          {accommodation}

          {terms ?? (
            <Card>
              <CardHeader>
                <CardTitle>Termíny</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border text-sm">
                  {registration.terms.map((term) => (
                    <li
                      key={term.termId}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
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
              </CardContent>
            </Card>
          )}
          {history}

          {needs}
        </div>

        <div className="space-y-6">
          <PaymentSummary registration={registration} />

          <Card>
            <CardHeader>
              <CardTitle>Přijaté platby</CardTitle>
            </CardHeader>
            <CardContent>
              <SimulatedPaymentHistory
                payments={registration.payments.map((payment) => ({
                  id: payment.id,
                  date: formatCalendarDate(payment.receivedOn),
                  amount: formatCzk(payment.amountMinor),
                  isSimulated: payment.source === "qr_link",
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PaymentSummary({ registration }: { registration: Detail }) {
  const balance = describeBalance(registration.balanceMinor)
  const hasNoObligation = registration.paymentState === "none"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platba</CardTitle>
        <CardAction>
          <PaymentStateBadge state={registration.paymentState} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <dl className="space-y-2 text-sm">
            <Row label="Cena vybraných termínů">
              <span className="font-mono tabular-nums">
                {formatCzk(registration.selectedPriceMinor)}
              </span>
            </Row>
            <Row label="Částka za potvrzené termíny">
              <span className="font-mono tabular-nums">
                {formatCzk(registration.amountDueMinor)}
              </span>
            </Row>
            <Row label="Zaplaceno">
              <span className="font-mono tabular-nums">{formatCzk(registration.paidMinor)}</span>
            </Row>
            {hasNoObligation ? null : (
              <Row label={balance.label}>
                <span className="font-mono font-medium tabular-nums">
                  {balance.amount ?? formatCzk(0)}
                </span>
              </Row>
            )}
            {registration.reminderAt ? (
              <Row label="Datum připomenutí platby">
                {formatPragueDate(registration.reminderAt)}
              </Row>
            ) : null}
            {registration.variableSymbol ? (
              <Row label="Variabilní symbol">
                <span className="font-mono">{registration.variableSymbol}</span>
              </Row>
            ) : null}
          </dl>
          {hasNoObligation ? (
            <p className="text-sm text-muted-foreground">Bez platební povinnosti</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
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
