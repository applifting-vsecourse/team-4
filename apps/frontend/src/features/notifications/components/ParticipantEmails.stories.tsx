import type { Meta, StoryObj } from "@storybook/react-vite"

import { ChangeRequestDecisionEmail } from "@/features/notifications/components/ChangeRequestDecisionEmail"
import { ChangeRequestReceivedEmail } from "@/features/notifications/components/ChangeRequestReceivedEmail"
import type { EmailPaymentSummaryProps } from "@/features/notifications/components/EmailPaymentSummary"
import type { EmailTerm } from "@/features/notifications/components/EmailTermList"
import { PaymentRecordedEmail } from "@/features/notifications/components/PaymentRecordedEmail"
import { RegistrationUpdateEmail } from "@/features/notifications/components/RegistrationUpdateEmail"

// F45-1 design preview: transactional e-mails to the participant. Static only: every
// value below is hard-coded. Each story is one message as it arrives in the inbox.

const EVENT = "Letní tábor Lipnice 2027"
const RECIPIENT = "jana.novakova@example.cz"
const BANK = { account: "2301234567/2010", variableSymbol: "2027014" }

const T1 = "1. turnus"
const T1_DATES = "4.–11. 7. 2027"
const T2 = "2. turnus"
const T2_DATES = "11.–18. 7. 2027"

const term = (id: string, name: string, dates: string, status: EmailTerm["status"]): EmailTerm => ({
  id,
  name,
  dates,
  status,
})

const BOTH_CONFIRMED = [
  term("t1", T1, T1_DATES, "confirmed"),
  term("t2", T2, T2_DATES, "confirmed"),
]

const DEBT_PAYMENT: EmailPaymentSummaryProps = {
  received: "3 000 Kč",
  balance: { kind: "debt", amount: "4 500 Kč" },
  bank: { ...BANK, reminderDate: "15. 6. 2027 (Europe/Prague)" },
}

const meta = {
  title: "Designs/F45-1 Participant e-mails",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

// Change made directly by the participant: a term added, with the updated overview and debt.
export const DirectChange: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – změna přihlášky: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Přihláška byla změněna"
      eventName={EVENT}
      explanation="Přidali jste termín 2. turnus. Místo je pro vás potvrzené."
      terms={BOTH_CONFIRMED}
      payment={DEBT_PAYMENT}
    />
  ),
}

// Term replaced by another one, made by the organizer on the participant's behalf.
export const TermChangedByOrganizer: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – změna termínu: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Termín byl změněn"
      eventName={EVENT}
      explanation="Organizátor vám přesunul účast z 1. turnusu na 2. turnus."
      terms={[term("t1", T1, T1_DATES, "cancelled"), term("t2", T2, T2_DATES, "confirmed")]}
      payment={{
        received: "3 000 Kč",
        balance: { kind: "debt", amount: "1 500 Kč" },
        bank: BANK,
      }}
    />
  ),
}

// Unregistered from one term; the other term stays.
export const UnregisteredFromTerm: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – odhlášení z termínu: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Odhlášení z termínu"
      eventName={EVENT}
      explanation="Odhlásili jste se z termínu 2. turnus. Termín 1. turnus zůstává beze změny."
      terms={[term("t1", T1, T1_DATES, "confirmed"), term("t2", T2, T2_DATES, "cancelled")]}
      payment={{
        received: "3 000 Kč",
        balance: { kind: "overpaid", amount: "1 500 Kč" },
      }}
    />
  ),
}

// The whole registration cancelled; nothing is left to pay.
export const UnregisteredWholeRegistration: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – odhlášení z akce: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Odhlášení z akce"
      eventName={EVENT}
      explanation="Vaše přihláška byla zrušena. Žádný termín už nemáte rezervovaný."
      terms={[term("t1", T1, T1_DATES, "cancelled"), term("t2", T2, T2_DATES, "cancelled")]}
    />
  ),
}

// Participation status changed by the organizer: a waitlisted participant confirmed.
export const WaitlistConfirmed: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – místo potvrzeno: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Místo bylo potvrzeno"
      eventName={EVENT}
      explanation="Uvolnilo se místo a v termínu 2. turnus jste nově potvrzený účastník."
      terms={[term("t1", T1, T1_DATES, "confirmed"), term("t2", T2, T2_DATES, "confirmed")]}
      payment={DEBT_PAYMENT}
    />
  ),
}

// Change request that needs approval: proposal kept apart from the data still in force.
export const ChangeRequestPending: Story = {
  render: () => (
    <ChangeRequestReceivedEmail
      subject={`akc.io – žádost o změnu přijata: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Žádost čeká na schválení"
      eventName={EVENT}
      explanation="Vaši žádost o přidání termínu 2. turnus jsme přijali. Rozhodne o ní organizátor. Zatím platí vaše dosavadní přihláška a nové místo ani změna nejsou potvrzené."
      currentTerms={[term("t1", T1, T1_DATES, "confirmed")]}
      proposedTerms={[term("t1", T1, T1_DATES, "confirmed"), term("t2", T2, T2_DATES, "pending")]}
    />
  ),
}

// Request approved: the resulting valid state and the payment due.
export const ChangeRequestApproved: Story = {
  render: () => (
    <ChangeRequestDecisionEmail
      subject={`akc.io – žádost schválena: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Žádost byla schválena"
      eventName={EVENT}
      explanation="Organizátor schválil vaši žádost o přidání termínu 2. turnus. Změna je provedena."
      terms={BOTH_CONFIRMED}
      payment={DEBT_PAYMENT}
    />
  ),
}

// Request rejected: nothing changed, the original registration stays valid.
export const ChangeRequestRejected: Story = {
  render: () => (
    <ChangeRequestDecisionEmail
      subject={`akc.io – žádost zamítnuta: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Žádost byla zamítnuta"
      eventName={EVENT}
      explanation="Organizátor zamítl vaši žádost o přidání termínu 2. turnus. Vaše přihláška zůstává beze změny."
      terms={[term("t1", T1, T1_DATES, "confirmed")]}
    />
  ),
}

// Manual payment recorded by the organizer; a debt remains, so bank details are shown.
export const ManualPartialPayment: Story = {
  render: () => (
    <PaymentRecordedEmail
      subject={`akc.io – platba zaznamenána: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Zaznamenali jsme vaši platbu"
      eventName={EVENT}
      explanation="Organizátor zapsal přijatou platbu. Platba ani zbývající dluh nemění potvrzení vaší účasti."
      terms={BOTH_CONFIRMED}
      payment={{
        recorded: { amount: "3 000 Kč", date: "28. 10. 2026", source: "manual" },
        received: "3 000 Kč",
        balance: { kind: "debt", amount: "4 500 Kč" },
        bank: { ...BANK, reminderDate: "15. 6. 2027 (Europe/Prague)" },
      }}
    />
  ),
}

// Partial simulated payment, marked as simulated; the remaining debt without a reminder date.
export const SimulatedPartialPayment: Story = {
  render: () => (
    <PaymentRecordedEmail
      subject={`akc.io – simulovaná platba zaznamenána: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Zaznamenali jsme simulovanou platbu"
      eventName={EVENT}
      explanation="Část dlužné částky jste uhradili simulovanou platbou přes QR odkaz. Nejde o skutečný převod peněz."
      terms={BOTH_CONFIRMED}
      payment={{
        recorded: { amount: "1 000 Kč", date: "28. 10. 2026", source: "simulated" },
        received: "4 000 Kč",
        balance: { kind: "debt", amount: "3 500 Kč" },
        bank: BANK,
      }}
    />
  ),
}

// Full simulated payment: zero debt, no further request to pay.
export const SimulatedFullPayment: Story = {
  render: () => (
    <PaymentRecordedEmail
      subject={`akc.io – simulovaná platba zaznamenána: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Zaznamenali jsme simulovanou platbu"
      eventName={EVENT}
      explanation="Zbývající částku jste uhradili simulovanou platbou přes QR odkaz. Nejde o skutečný převod peněz."
      terms={BOTH_CONFIRMED}
      payment={{
        recorded: { amount: "4 500 Kč", date: "28. 10. 2026", source: "simulated" },
        received: "7 500 Kč",
        balance: { kind: "settled", amount: "0 Kč" },
      }}
    />
  ),
}

// Payment above the price: an overpayment, no request to pay and no promise of a refund.
export const PaymentOverpaid: Story = {
  render: () => (
    <PaymentRecordedEmail
      subject={`akc.io – platba zaznamenána: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Zaznamenali jsme vaši platbu"
      eventName={EVENT}
      explanation="Přijaté platby přesahují cenu vašich termínů o 500 Kč. O naložení s přeplatkem se domluvte s organizátorem."
      terms={BOTH_CONFIRMED}
      payment={{
        recorded: { amount: "3 000 Kč", date: "28. 10. 2026", source: "manual" },
        received: "8 000 Kč",
        balance: { kind: "overpaid", amount: "500 Kč" },
      }}
    />
  ),
}

// One summary for a batch evaluation: mixed term results and payment details in a single message.
export const EvaluationResultMixed: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – výsledek vyhodnocení přihlášek: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Výsledek vyhodnocení"
      eventName={EVENT}
      explanation="Organizátor vyhodnotil přihlášky. V termínu 1. turnus máte místo, v termínu 2. turnus jste náhradník. Za nepotvrzený termín nic neplatíte."
      terms={[term("t1", T1, T1_DATES, "confirmed"), term("t2", T2, T2_DATES, "waitlisted")]}
      payment={{
        received: "0 Kč",
        balance: { kind: "debt", amount: "3 000 Kč" },
        bank: { ...BANK, reminderDate: "15. 6. 2027 (Europe/Prague)" },
      }}
    />
  ),
}

// Evaluation where every term is a waitlist spot: nothing to pay.
export const EvaluationResultAllWaitlisted: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – výsledek vyhodnocení přihlášek: ${EVENT}`}
      recipient={RECIPIENT}
      heading="Výsledek vyhodnocení"
      eventName={EVENT}
      explanation="Organizátor vyhodnotil přihlášky. Ve všech vybraných termínech jste zatím náhradník. Nic neplatíte; napíšeme vám, pokud se místo uvolní."
      terms={[term("t1", T1, T1_DATES, "waitlisted"), term("t2", T2, T2_DATES, "waitlisted")]}
    />
  ),
}

// Contact e-mail differs from the account's sign-in e-mail: the message carries no magic link.
export const WithoutMagicLink: Story = {
  render: () => (
    <RegistrationUpdateEmail
      subject={`akc.io – změna přihlášky: ${EVENT}`}
      recipient="rodice.novakovi@example.cz"
      heading="Přihláška byla změněna"
      eventName={EVENT}
      hasMagicLink={false}
      explanation="Organizátor vám přidal termín 2. turnus. Místo je pro vás potvrzené."
      terms={BOTH_CONFIRMED}
      payment={DEBT_PAYMENT}
    />
  ),
}
