import type { ComponentProps, ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronLeft, LogOut, MapPin } from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  ChangeRequestCard,
  type ChangeRequestCardProps,
} from "@/features/registrations/components/ChangeRequestCard"
import { type ChangeSummaryProps } from "@/features/registrations/components/ChangeSummary"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { RegistrationChangeActions } from "@/features/registrations/components/RegistrationChangeActions"
import {
  RegistrationChangeDialog,
  type RegistrationChangeDialogProps,
} from "@/features/registrations/components/RegistrationChangeDialog"
import {
  RegistrationChangeForm,
  type ChangeableTerm,
  type ContactValues,
} from "@/features/registrations/components/RegistrationChangeForm"
import {
  RegistrationHistory,
  type HistoryEntry,
} from "@/features/registrations/components/RegistrationHistory"
import {
  RegistrationTermStates,
  type TermStateRow,
} from "@/features/registrations/components/RegistrationTermStates"

// F35-2a design preview, participant side: editing, moving and cancelling an
// own registration, with or without the organizer's approval.
// Static only: no router links, queries or API; every value below is hard-coded.
// The organizer approves changes from 14 days before a term (F35-1a): Turnus 1
// starts within that threshold, the later terms do not.

const EVENT = "Víkendovky Modrá Hora – podzim 2026"
const LOCATION = "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko"

const T1 = { id: "turnus-1", label: "Turnus 1", dates: "6. 11. – 8. 11. 2026", price: "2 400 Kč" }
const T2 = { id: "turnus-2", label: "Turnus 2", dates: "20. 11. – 22. 11. 2026", price: "2 400 Kč" }
const T3 = { id: "turnus-3", label: "Turnus 3", dates: "4. 12. – 6. 12. 2026", price: "2 900 Kč" }
const T4 = { id: "turnus-4", label: "Turnus 4", dates: "18. 12. – 20. 12. 2026", price: "2 900 Kč" }

const details = (term: typeof T1) => `${term.dates} · ${term.price}`

const CONTACT: ContactValues = {
  firstName: "Jana",
  lastName: "Nováková",
  email: "jana.novakova@seznam.cz",
  phone: "+420 604 123 456",
}

// --- Detail přihlášky ------------------------------------------------------

const ACTIVE_TERMS: TermStateRow[] = [
  { id: T1.id, label: T1.label, details: details(T1), state: "confirmed" },
  { id: T2.id, label: T2.label, details: details(T2), state: "confirmed" },
]

type PaymentSummaryProps = ComponentProps<typeof ParticipantPaymentSummary>

const PAID_IN_FULL: PaymentSummaryProps = {
  selectedPriceMinor: 480000,
  amountDueMinor: 480000,
  paidMinor: 480000,
  balanceMinor: 0,
  instructions: null,
}

const PAYMENTS = [{ id: "platba-1", receivedOn: "12. 10. 2026", amount: "4 800 Kč" }]

// --- Proposed changes ------------------------------------------------------

/** Turnus 2 → Turnus 3, both outside the threshold: goes through directly. */
const MOVE_T2_T3: ChangeSummaryProps = {
  terms: [
    { ...T2, original: "confirmed", proposed: "cancelled" },
    { ...T3, original: null, proposed: "confirmed" },
  ],
  money: [
    { label: "K úhradě za potvrzené termíny", original: "4 800 Kč", proposed: "5 300 Kč" },
    { label: "Zaplaceno", original: "4 800 Kč", proposed: "4 800 Kč" },
    { label: "Zbývá zaplatit", original: "0 Kč", proposed: "500 Kč" },
  ],
}

/** Contact data: every active term counts, Turnus 1 is within the threshold. */
const CONTACT_CHANGE: ChangeSummaryProps = {
  values: [
    { label: "E-mail", original: "jana.novakova@seznam.cz", proposed: "jana.novakova@gmail.com" },
    { label: "Telefon", original: "+420 604 123 456", proposed: "+420 731 987 654" },
  ],
  terms: [
    { ...T1, original: "confirmed", proposed: "confirmed" },
    { ...T2, original: "confirmed", proposed: "confirmed" },
  ],
}

/** Turnus 2 → full Turnus 4: the confirmed place is lost, the new one is a waitlist one. */
const MOVE_TO_FULL: ChangeSummaryProps = {
  terms: [
    { ...T2, original: "confirmed", proposed: "cancelled" },
    { ...T4, original: null, proposed: "waitlisted" },
  ],
  money: [
    { label: "K úhradě za potvrzené termíny", original: "4 800 Kč", proposed: "2 400 Kč" },
    { label: "Zaplaceno", original: "4 800 Kč", proposed: "4 800 Kč" },
    { label: "Přeplatek", original: "0 Kč", proposed: "2 400 Kč" },
  ],
}

/** Turnus 3 filled up between the review and the execution. */
const MOVE_RESULT_CHANGED: ChangeSummaryProps = {
  terms: [
    { ...T2, original: "confirmed", proposed: "cancelled" },
    { ...T3, original: null, proposed: "waitlisted" },
  ],
  money: MOVE_TO_FULL.money,
}

/** Only Turnus 2 is cancelled; outside the threshold, so directly. */
const CANCEL_T2: ChangeSummaryProps = {
  terms: [{ ...T2, original: "confirmed", proposed: "cancelled" }],
  money: [
    { label: "K úhradě za potvrzené termíny", original: "4 800 Kč", proposed: "2 400 Kč" },
    { label: "Zaplaceno", original: "4 800 Kč", proposed: "4 800 Kč" },
    { label: "Přeplatek", original: "0 Kč", proposed: "2 400 Kč" },
  ],
}

/** All active terms; Turnus 1 is within the threshold, so a request. */
const CANCEL_ALL: ChangeSummaryProps = {
  terms: [
    { ...T1, original: "confirmed", proposed: "cancelled" },
    { ...T2, original: "confirmed", proposed: "cancelled" },
  ],
  money: [
    { label: "K úhradě za potvrzené termíny", original: "4 800 Kč", proposed: "0 Kč" },
    { label: "Zaplaceno", original: "4 800 Kč", proposed: "4 800 Kč" },
    { label: "Přeplatek", original: "0 Kč", proposed: "4 800 Kč" },
  ],
}

/** Turnus 1 → Turnus 3: Turnus 1 is within the threshold, so a request. */
const MOVE_T1_T3: ChangeSummaryProps = {
  terms: [
    { ...T1, original: "confirmed", proposed: "cancelled" },
    { ...T3, original: null, proposed: "confirmed" },
  ],
  money: MOVE_T2_T3.money,
}

const REQUEST_T1_T3: ChangeRequestCardProps = {
  status: "pending",
  kind: "Přesun termínu",
  submittedAt: "30. 10. 2026 14:05",
  summary: MOVE_T1_T3,
}

// --- Úprava přihlášky ------------------------------------------------------

const OPTIONS_FOR = (current: typeof T1) => [
  { id: current.id, label: `${current.label} · ${details(current)}` },
  { id: T3.id, label: `${T3.label} · ${details(T3)}` },
  { id: T4.id, label: `${T4.label} · ${details(T4)} · obsazeno` },
]

const EDIT_TERMS: ChangeableTerm[] = [
  {
    id: T1.id,
    label: T1.label,
    details: details(T1),
    status: "confirmed",
    options: OPTIONS_FOR(T1),
    selectedTermId: T1.id,
  },
  {
    id: T2.id,
    label: T2.label,
    details: details(T2),
    status: "confirmed",
    options: OPTIONS_FOR(T2),
    selectedTermId: T3.id,
  },
]

// --- Page shells -----------------------------------------------------------

// The participant frame (ParticipantLayout), static: logo, theme, "Odhlásit se".
function ParticipantFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <BrandMark isLarge />
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
            >
              <LogOut />
              Odhlásit se
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}

const BackButton = ({ label }: { label: string }) => (
  <Button
    variant="ghost"
    size="sm"
  >
    <ChevronLeft />
    {label}
  </Button>
)

const EventHeading = ({ title, badge }: { title: string; badge?: ReactNode }) => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-h2 wrap-break-word">{title}</h1>
      {badge}
    </div>
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <MapPin
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
      />
      <span className="wrap-break-word">{LOCATION}</span>
    </p>
  </div>
)

// Moje přihlášky → Detail přihlášky, static, as on the live page plus F35-2a.
type DetailPageProps = {
  terms: TermStateRow[]
  payment: PaymentSummaryProps
  request?: ChangeRequestCardProps
  history?: HistoryEntry[]
  /** Every term released: the registration reads as cancelled, no changes offered. */
  isCancelled?: boolean
  /** An open dialog over the page. */
  children?: ReactNode
}

function DetailPage({ terms, payment, request, history, isCancelled, children }: DetailPageProps) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackButton label="Moje přihlášky" />
          {isCancelled ? null : <RegistrationChangeActions />}
        </div>

        <EventHeading
          title={EVENT}
          badge={isCancelled ? <Badge variant="secondary">Odhlášená přihláška</Badge> : null}
        />

        {request ? <ChangeRequestCard {...request} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Termíny</CardTitle>
          </CardHeader>
          <CardContent>
            <RegistrationTermStates terms={terms} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platba</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantPaymentSummary {...payment} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Přijaté platby</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {PAYMENTS.map((payment) => (
                <li
                  key={payment.id}
                  className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{payment.receivedOn}</span>
                  <span className="font-mono">{payment.amount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {history ? (
          <Card>
            <CardHeader>
              <CardTitle>Historie změn</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationHistory entries={history} />
            </CardContent>
          </Card>
        ) : null}
      </section>
      {children}
    </ParticipantFrame>
  )
}

// Moje přihlášky → Detail přihlášky → Úprava přihlášky, static.
function EditPage({ children }: { children?: ReactNode }) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <BackButton label="Detail přihlášky" />
        <div className="space-y-2">
          <h1 className="text-h2">Úprava přihlášky</h1>
          <p className="text-sm text-muted-foreground">{EVENT}</p>
        </div>
        <RegistrationChangeForm
          contact={CONTACT}
          terms={EDIT_TERMS}
        />
      </section>
      {children}
    </ParticipantFrame>
  )
}

const review = (props: Omit<RegistrationChangeDialogProps, "isOpen">) =>
  function Review() {
    return (
      <EditPage>
        <RegistrationChangeDialog
          isOpen
          {...props}
        />
      </EditPage>
    )
  }

const meta = {
  title: "Designs/F35-2a Participant changes",
  component: DetailPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { terms: ACTIVE_TERMS, payment: PAID_IN_FULL },
} satisfies Meta<typeof DetailPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Own registration: editing and cancelling are offered. */
export const Detail: Story = {}

/** Editing: contact data, Turnus 2 moved to Turnus 3; the full Turnus 4 is marked. */
export const EditForm: Story = { render: () => <EditPage /> }

/** A move outside the threshold: the price and balance per term, then a direct change. */
export const ReviewDirectMove: Story = {
  render: review({ summary: MOVE_T2_T3, hasFinancialImpact: true }),
}

/** Contact data while Turnus 1 is within the threshold: sent as a request. */
export const ReviewContactNeedsApproval: Story = {
  render: review({ summary: CONTACT_CHANGE, isApprovalRequired: true }),
}

/** The threshold passed while the form was open: only a request can be sent. */
export const ApprovalNewlyRequired: Story = {
  render: review({ summary: MOVE_T2_T3, hasFinancialImpact: true, isApprovalNewlyRequired: true }),
}

/** A move to a full term: the lost place is named, nothing goes without consent. */
export const MoveToWaitlist: Story = {
  render: review({
    summary: MOVE_TO_FULL,
    hasFinancialImpact: true,
    waitlist: { targetTerm: "Turnus 4", lostTerm: "Turnus 2" },
  }),
}

/** Capacity re-checked on execution: the result is now a waitlist, the place stays until consent. */
export const MoveResultChanged: Story = {
  render: review({
    summary: MOVE_RESULT_CHANGED,
    hasFinancialImpact: true,
    waitlist: { targetTerm: "Turnus 3", lostTerm: "Turnus 2", hasResultChanged: true },
  }),
}

/** Cancelling one term: only it is released, an overpayment may appear. */
export const CancelTerm: Story = {
  render: review({ summary: CANCEL_T2, isCancellation: true, hasFinancialImpact: true }),
}

/** Cancelling the whole registration while Turnus 1 is within the threshold: a request. */
export const CancelRegistration: Story = {
  args: {
    children: (
      <RegistrationChangeDialog
        isOpen
        isCancellation
        isApprovalRequired
        hasFinancialImpact
        summary={CANCEL_ALL}
      />
    ),
  },
}

/** Sending failed: the error and a retry, no success and no change. */
export const SubmitFailed: Story = {
  parameters: contrastWarning,
  render: review({
    summary: MOVE_T2_T3,
    hasFinancialImpact: true,
    errorMessage: "Změnu se nepodařilo odeslat. Zkuste to prosím znovu.",
  }),
}

/** The registration changed meanwhile: the old proposal is not sent, a reload is asked. */
export const StaleProposal: Story = {
  render: review({ summary: MOVE_T2_T3, hasFinancialImpact: true, isStale: true }),
}

/** A request awaits the organizer: the valid terms and balance are unchanged. */
export const RequestPending: Story = { args: { request: REQUEST_T1_T3 } }

/** The request was approved: Turnus 3 replaces Turnus 1, the payments stay and 500 Kč remain. */
export const RequestApproved: Story = {
  args: {
    request: { ...REQUEST_T1_T3, status: "approved", decidedAt: "31. 10. 2026 9:12" },
    terms: [
      { id: T1.id, label: T1.label, details: details(T1), state: "cancelled" },
      { id: T2.id, label: T2.label, details: details(T2), state: "confirmed" },
      { id: T3.id, label: T3.label, details: details(T3), state: "confirmed" },
    ],
    payment: {
      selectedPriceMinor: 530000,
      amountDueMinor: 530000,
      paidMinor: 480000,
      balanceMinor: 50000,
      instructions: {
        amountMinor: 50000,
        variableSymbol: "2026110412",
        account: { prefix: null, number: "2801234567", bankCode: "2010" },
        reminderAt: "2026-11-03T09:00:00Z",
      },
    },
    history: [
      {
        id: "h-1",
        at: "31. 10. 2026 9:12",
        text: "Přesun z termínu Turnus 1 na Turnus 3 schválen",
      },
    ],
  },
}

/** The request was rejected: the registration stays as it was. */
export const RequestRejected: Story = {
  args: {
    request: { ...REQUEST_T1_T3, status: "rejected", decidedAt: "31. 10. 2026 9:12" },
    history: [
      {
        id: "h-1",
        at: "31. 10. 2026 9:12",
        text: "Přesun z termínu Turnus 1 na Turnus 3 zamítnut",
      },
    ],
  },
}

/** A direct cancellation of Turnus 2: its place is released, the payments stay as an overpayment. */
export const TermCancelled: Story = {
  args: {
    terms: [
      { id: T1.id, label: T1.label, details: details(T1), state: "confirmed" },
      { id: T2.id, label: T2.label, details: details(T2), state: "cancelled" },
    ],
    payment: {
      selectedPriceMinor: 240000,
      amountDueMinor: 240000,
      paidMinor: 480000,
      balanceMinor: -240000,
      instructions: null,
    },
    history: [{ id: "h-1", at: "30. 10. 2026 14:05", text: "Odhlášení z termínu Turnus 2" }],
  },
}

/** Every term cancelled: a cancelled registration with its history and payments, no changes offered. */
export const RegistrationCancelled: Story = {
  args: {
    isCancelled: true,
    terms: [
      { id: T1.id, label: T1.label, details: details(T1), state: "cancelled" },
      { id: T2.id, label: T2.label, details: details(T2), state: "cancelled" },
    ],
    payment: {
      selectedPriceMinor: 0,
      amountDueMinor: 0,
      paidMinor: 480000,
      balanceMinor: -480000,
      instructions: null,
    },
    history: [
      { id: "h-2", at: "31. 10. 2026 9:12", text: "Odhlášení přihlášky schváleno" },
      { id: "h-1", at: "30. 10. 2026 14:05", text: "Žádost o odhlášení přihlášky odeslána" },
    ],
  },
}
