import type { Meta, StoryObj } from "@storybook/react-vite"

import type { EmailTerm } from "@/features/notifications/components/EmailTermList"
import { ParticipantEmail } from "@/features/notifications/components/ParticipantEmail"

// F45-1 design preview: the single participant e-mail template. Static only: every
// value below is hard-coded. The stories show the template's blocks (terms, proposed
// change, payment by balance, organizer contact, magic link) for the key events; the
// remaining reasons only swap the fixed copy in PARTICIPANT_EMAIL_REASONS.

const EVENT = "Letní tábor Lipnice 2027"
const RECIPIENT = "jana.novakova@example.cz"
const ORGANIZER = {
  name: "Spolek Lipnice, z. s.",
  email: "tabor@spolek-lipnice.cz",
  phone: "+420 603 214 587",
}
const BANK = { account: "2301234567/2010", variableSymbol: "2027014" }

const term = (id: string, name: string, dates: string, status: EmailTerm["status"]): EmailTerm => ({
  id,
  name,
  dates,
  status,
})

const T1_CONFIRMED = term("t1", "1. turnus", "4.–11. 7. 2027", "confirmed")
const T2_CONFIRMED = term("t2", "2. turnus", "11.–18. 7. 2027", "confirmed")
const T1_WAITLISTED = term("t1", "1. turnus", "4.–11. 7. 2027", "waitlisted")
const T2_WAITLISTED = term("t2", "2. turnus", "11.–18. 7. 2027", "waitlisted")
const T2_PENDING = term("t2", "2. turnus", "11.–18. 7. 2027", "pending")

const meta = {
  title: "Not implemented/F45-1 Participant e-mails",
  component: ParticipantEmail,
  parameters: { layout: "fullscreen" },
  args: { eventName: EVENT, recipient: RECIPIENT, organizer: ORGANIZER },
} satisfies Meta<typeof ParticipantEmail>

export default meta

type Story = StoryObj<typeof meta>

// Batch evaluation, mixed result: a debt for the confirmed term, so bank details, reminder date and QR.
export const EvaluationMixed: Story = {
  args: {
    reason: "evaluation",
    terms: [T1_CONFIRMED, T2_WAITLISTED],
    payment: {
      received: "0 Kč",
      balance: { kind: "debt", amount: "3 000 Kč" },
      bank: { ...BANK, reminderDate: "15. 6. 2027 (Europe/Prague)" },
    },
  },
}

// Batch evaluation with every term waitlisted: nothing to pay, so no payment block.
export const EvaluationAllWaitlisted: Story = {
  args: {
    reason: "evaluation",
    terms: [T1_WAITLISTED, T2_WAITLISTED],
  },
}

// A spot freed up: the waitlisted term is now confirmed, with the new debt and QR.
export const WaitlistConfirmed: Story = {
  args: {
    reason: "waitlistConfirmed",
    terms: [T1_CONFIRMED, T2_CONFIRMED],
    payment: {
      received: "3 000 Kč",
      balance: { kind: "debt", amount: "4 500 Kč" },
      bank: { ...BANK, reminderDate: "15. 6. 2027 (Europe/Prague)" },
    },
  },
}

// Change request awaiting approval: the valid terms kept apart from the proposal, no payment.
export const ChangeRequestPending: Story = {
  args: {
    reason: "requestReceived",
    terms: [T1_CONFIRMED],
    proposedTerms: [T1_CONFIRMED, T2_PENDING],
  },
}

// Request approved by the organizer: the only message for the executed change, with the new debt and QR.
export const ChangeRequestApproved: Story = {
  args: {
    reason: "requestApproved",
    terms: [T1_CONFIRMED, T2_CONFIRMED],
    payment: {
      received: "3 000 Kč",
      balance: { kind: "debt", amount: "4 500 Kč" },
      bank: BANK,
    },
  },
}

// Request rejected by the organizer: the registration stays as it was, already paid in full.
export const ChangeRequestRejected: Story = {
  args: {
    reason: "requestRejected",
    terms: [T1_CONFIRMED],
    payment: {
      received: "3 000 Kč",
      balance: { kind: "settled", amount: "0 Kč" },
    },
  },
}

// Payment that settles the debt: the payment, total received and zero left to pay.
export const PaymentSettled: Story = {
  args: {
    reason: "paymentRecorded",
    terms: [T1_CONFIRMED, T2_CONFIRMED],
    payment: {
      recorded: { amount: "4 500 Kč", date: "28. 10. 2026" },
      received: "7 500 Kč",
      balance: { kind: "settled", amount: "0 Kč" },
    },
  },
}

// Payment above the price: an overpayment, no request to pay and no promise of a refund.
export const PaymentOverpaid: Story = {
  args: {
    reason: "paymentRecorded",
    terms: [T1_CONFIRMED, T2_CONFIRMED],
    payment: {
      recorded: { amount: "5 000 Kč", date: "28. 10. 2026" },
      received: "8 000 Kč",
      balance: { kind: "overpaid", amount: "500 Kč" },
    },
  },
}

// Contact e-mail differs from the account's sign-in e-mail: the button leads to the standard sign-in.
export const WithoutMagicLink: Story = {
  args: {
    reason: "organizerChange",
    recipient: "rodice.novakovi@example.cz",
    hasMagicLink: false,
    terms: [T1_CONFIRMED, T2_CONFIRMED],
    payment: {
      received: "3 000 Kč",
      balance: { kind: "debt", amount: "4 500 Kč" },
      bank: BANK,
    },
  },
}
