import type { ReactNode } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
}: RegistrationDetailProps) {
  const updated = formatPragueDateTime(new Date(updatedAt).toISOString())

  return (
    <div
      className="space-y-6"
      aria-busy={isRefreshing}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Přijato {formatPragueDateTime(registration.receivedAt)}
          {hasRefreshFailed ? null : ` · aktualizováno ${updated}`}
        </p>
        <Button
          variant="outline"
          onClick={() => onRefresh()}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw />}
          {isRefreshing ? "Aktualizuji…" : "Aktualizovat"}
        </Button>
      </div>

      {hasRefreshFailed ? (
        <Alert variant="destructive">
          <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
          <AlertDescription>
            <p>Zobrazené údaje jsou z posledního úspěšného načtení ({updated}).</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onRefresh()}
              disabled={isRefreshing}
            >
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
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
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <PaymentStateBadge state={registration.paymentState} />
          <dl className="space-y-2 text-sm">
            <Row label="Cena vybraných termínů">{formatCzk(registration.selectedPriceMinor)}</Row>
            <Row label="Částka za potvrzené termíny">{formatCzk(registration.amountDueMinor)}</Row>
            <Row label="Přijato">{formatCzk(registration.paidMinor)}</Row>
            {hasNoObligation ? null : (
              <Row label={balance.label}>
                <span className="font-medium">{balance.amount ?? formatCzk(0)}</span>
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
