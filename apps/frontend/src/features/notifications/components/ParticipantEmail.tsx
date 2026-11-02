import { EmailLayout, type EmailLayoutProps } from "@/features/notifications/components/EmailLayout"
import {
  EmailPaymentSummary,
  type EmailPaymentSummaryProps,
} from "@/features/notifications/components/EmailPaymentSummary"
import { EmailTermList, type EmailTerm } from "@/features/notifications/components/EmailTermList"

// Změna v přihlášce / žádosti / účasti / platbě → e-mail → Moje přihlášky (F45-1).
// Design only: every value is passed in. One template for every participant e-mail:
// a fixed reason, then a snapshot of the saved state. Only the reason picks the text;
// terms and the payment block come from the current registration, never from a diff,
// so one saved event always gives exactly one message.

export type ParticipantEmailReason =
  | "evaluation"
  | "waitlistConfirmed"
  | "organizerChange"
  | "balanceChanged"
  | "requestReceived"
  | "requestApproved"
  | "requestRejected"
  | "paymentRecorded"

/** Fixed copy per reason; the event name is the only variable. */
export const PARTICIPANT_EMAIL_REASONS: Record<
  ParticipantEmailReason,
  { subject: string; heading: string; sentence: string }
> = {
  evaluation: {
    subject: "výsledek vyhodnocení přihlášek",
    heading: "Výsledek vyhodnocení",
    sentence:
      "Organizátor vyhodnotil přihlášky. Za termíny, ve kterých jste náhradník, nic neplatíte.",
  },
  waitlistConfirmed: {
    subject: "místo potvrzeno",
    heading: "Uvolnilo se místo",
    sentence: "V jednom z vašich termínů se uvolnilo místo a vaše účast je nyní potvrzená.",
  },
  organizerChange: {
    subject: "změna přihlášky",
    heading: "Organizátor upravil vaši přihlášku",
    sentence: "Organizátor upravil vaši přihlášku. Níže je její aktuální stav.",
  },
  balanceChanged: {
    subject: "nová částka k úhradě",
    heading: "Změnila se částka k úhradě",
    sentence: "Po úpravě vaší přihlášky se změnila částka k úhradě.",
  },
  requestReceived: {
    subject: "žádost o změnu přijata",
    heading: "Žádost čeká na schválení",
    sentence:
      "Vaši žádost o změnu jsme přijali a rozhodne o ní organizátor. Do té doby platí dosavadní přihláška.",
  },
  requestApproved: {
    subject: "žádost schválena",
    heading: "Žádost byla schválena",
    sentence: "Organizátor schválil vaši žádost o změnu. Změna je provedená.",
  },
  requestRejected: {
    subject: "žádost zamítnuta",
    heading: "Žádost byla zamítnuta",
    sentence: "Organizátor zamítl vaši žádost o změnu. Přihláška zůstává beze změny.",
  },
  paymentRecorded: {
    subject: "platba přijata",
    heading: "Přijali jsme vaši platbu",
    sentence: "Zaznamenali jsme vaši platbu.",
  },
}

export type ParticipantEmailProps = {
  reason: ParticipantEmailReason
  eventName: string
  recipient: string
  organizer: EmailLayoutProps["organizer"]
  /** The valid terms after the event, each with its own status. */
  terms: EmailTerm[]
  /** Only for "requestReceived": the terms as proposed, kept apart from the valid ones. */
  proposedTerms?: EmailTerm[]
  /** Omitted when the registration has nothing to pay and no payments. */
  payment?: EmailPaymentSummaryProps
  /** False when the contact e-mail differs from the account's sign-in e-mail. */
  hasMagicLink?: boolean
}

export function ParticipantEmail({
  reason,
  eventName,
  recipient,
  organizer,
  terms,
  proposedTerms,
  payment,
  hasMagicLink,
}: ParticipantEmailProps) {
  const copy = PARTICIPANT_EMAIL_REASONS[reason]

  return (
    <EmailLayout
      subject={`akc.io — ${copy.subject}: ${eventName}`}
      recipient={recipient}
      heading={copy.heading}
      eventName={eventName}
      organizer={organizer}
      hasMagicLink={hasMagicLink}
    >
      <p className="text-base">{copy.sentence}</p>
      <EmailTermList
        title={proposedTerms ? "Stále platí" : "Vaše termíny"}
        terms={terms}
      />
      {proposedTerms ? (
        <EmailTermList
          title="Navrhovaná změna"
          terms={proposedTerms}
        />
      ) : null}
      {payment ? <EmailPaymentSummary {...payment} /> : null}
    </EmailLayout>
  )
}
