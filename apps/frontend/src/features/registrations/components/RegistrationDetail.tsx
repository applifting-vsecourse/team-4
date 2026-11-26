import type { ReactNode } from "react"
import { Mail, Phone } from "lucide-react"

import { CardTitleRow } from "@/components/CardTitleRow"
import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
import { LoadError } from "@/components/LoadError"
import { Money } from "@/components/Money"
import { ParticipationBadge } from "@/components/ParticipationBadge"
import { RefreshButton } from "@/components/RefreshButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCalendarRange, formatPragueDate, formatPragueDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type RegistrationDetail as Detail } from "@/features/registrations/api/eventRegistrationSchemas"
import { BalanceAmount } from "@/features/registrations/components/BalanceAmount"
import { PaymentStateBadge } from "@/features/registrations/components/PaymentStateBadge"
import { QuestionAnswersList } from "@/features/registrations/components/QuestionAnswersList"
import { ReceivedPaymentsTable } from "@/features/registrations/components/ReceivedPaymentsTable"
import {
  DEFAULT_REGISTRATION_DETAIL_TAB,
  REGISTRATION_DETAIL_TABS,
  type RegistrationDetailTab,
} from "@/features/registrations/lib/detailTabs"

type RegistrationDetailProps = {
  registration: Detail
  /** When the shown data were read from the server (ms since epoch). */
  updatedAt: number
  isRefreshing: boolean
  /** The last refresh failed; `registration` is still from the one before. */
  hasRefreshFailed: boolean
  onRefresh: () => unknown
  tab?: RegistrationDetailTab
  onTabChange?: (tab: RegistrationDetailTab) => void
  /** Above the tabs whichever is selected, e.g. a request waiting for a decision. */
  notice?: ReactNode
  /** Records a payment; belongs to the payments, not to the header. */
  paymentAction?: ReactNode
  /** Transport, diet and health with the organizer's correction (F63). */
  needs?: ReactNode
  /** The gender answer, its correction, the wishes and the rooms (F64, S4-05). */
  accommodation?: ReactNode
  /** Replaces the list of terms, e.g. with each term's proposal (S3-01). */
  terms?: ReactNode
  /** The histories of the changes and of the evaluation (S3-01). */
  history?: ReactNode
}

// The organizer's view of one registration (S2-11, F38-1): a common summary
// above six tabs. Every tab stays mounted while another one is shown, so
// switching never drops a half-written edit. Recording a payment (S2-12)
// refreshes it through the shared query key.
export function RegistrationDetail({
  registration,
  updatedAt,
  isRefreshing,
  hasRefreshFailed,
  onRefresh,
  tab = DEFAULT_REGISTRATION_DETAIL_TAB,
  onTabChange,
  notice,
  paymentAction,
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

      <RegistrationSummary registration={registration} />

      {notice}

      <Tabs
        value={tab}
        onValueChange={(next) => onTabChange?.(next as RegistrationDetailTab)}
      >
        <HorizontalOverflowViewport>
          <TabsList
            aria-label="Detail přihlášky"
            className="w-max min-w-full"
          >
            {REGISTRATION_DETAIL_TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </HorizontalOverflowViewport>

        <TabPanel value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Osobní údaje</CardTitle>
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
                {registration.answers.length > 0 ? (
                  <section aria-label="Otázky pořadatele">
                    <h2 className="mb-3 text-sm font-semibold">Otázky pořadatele</h2>
                    <QuestionAnswersList answers={registration.answers} />
                  </section>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="terms">
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
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value="accommodation">{accommodation}</TabPanel>

        <TabPanel value="payments">
          <Card>
            <CardHeader>
              <CardTitleRow
                title="Platby"
                action={paymentAction}
              />
            </CardHeader>
            <CardContent>
              <PaymentSummary registration={registration} />
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="needs">{needs}</TabPanel>

        <TabPanel value="history">{history}</TabPanel>
      </Tabs>
    </div>
  )
}

/** Stays mounted while hidden, so an unsaved edit survives a switch of the tab. */
function TabPanel({ value, children }: { value: RegistrationDetailTab; children: ReactNode }) {
  return (
    <TabsContent
      value={value}
      forceMount
      className="mt-6 data-[state=inactive]:hidden"
    >
      <div className="space-y-6">{children}</div>
    </TabsContent>
  )
}

// The common header of every tab: how to reach the person, how many terms are
// confirmed or waiting (mixed participation is never one status of the whole
// registration) and what is left to pay.
function RegistrationSummary({ registration }: { registration: Detail }) {
  const confirmed = registration.terms.filter((term) => term.status === "confirmed").length
  const waiting = registration.terms.filter(
    (term) => term.status === "pending" || term.status === "waitlisted",
  ).length
  const hasObligation = registration.paymentState !== "none"
  const isOverpaid = registration.balanceMinor < 0

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-medium wrap-break-word">
              {registration.firstName} {registration.lastName}
            </p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${registration.email}`}
                  className="wrap-break-word text-foreground"
                >
                  {registration.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={`tel:${registration.phone.replace(/\s/g, "")}`}
                  className="text-foreground"
                >
                  {registration.phone}
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Termíny</p>
            <p className="font-medium">
              Potvrzené {confirmed} · Čekající {waiting}
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Platba</p>
            <div className="flex flex-wrap items-center gap-3">
              <PaymentStateBadge state={registration.paymentState} />
              {hasObligation ? (
                <span className="flex items-baseline gap-2">
                  <span>{isOverpaid ? "Přeplatek" : "Zbývá zaplatit"}</span>
                  <BalanceAmount
                    amount={formatCzk(Math.abs(registration.balanceMinor))}
                    isSettled={registration.balanceMinor <= 0}
                  />
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentSummary({ registration }: { registration: Detail }) {
  const hasNoObligation = registration.paymentState === "none"
  const isOverpaid = registration.balanceMinor < 0

  return (
    <section aria-label="Platba">
      <DefinitionList>
        {hasNoObligation ? null : (
          <DefinitionRow label="Celkem k úhradě">
            <Money minor={registration.amountDueMinor} />
          </DefinitionRow>
        )}
        <DefinitionRow label="Zaplaceno">
          <Money minor={registration.paidMinor} />
        </DefinitionRow>
        {hasNoObligation ? null : (
          <DefinitionRow
            label={isOverpaid ? "Přeplatek" : "Zbývá zaplatit"}
            isEmphasised
          >
            <BalanceAmount
              amount={formatCzk(Math.abs(registration.balanceMinor))}
              isSettled={registration.balanceMinor <= 0}
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
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Přijaté platby</h3>
        <ReceivedPaymentsTable payments={registration.payments} />
      </div>
    </section>
  )
}
