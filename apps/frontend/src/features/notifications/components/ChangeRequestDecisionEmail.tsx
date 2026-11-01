import { EmailLayout, type EmailLayoutProps } from "@/features/notifications/components/EmailLayout"
import {
  EmailPaymentSummary,
  type EmailPaymentSummaryProps,
} from "@/features/notifications/components/EmailPaymentSummary"
import { EmailTermList, type EmailTerm } from "@/features/notifications/components/EmailTermList"

// E-mail with the organizer's decision on a change request (F45-1). Design only: every
// value is passed in. Approval is the only message for the executed change.

export type ChangeRequestDecisionEmailProps = Omit<EmailLayoutProps, "children"> & {
  explanation: string
  /** The valid state after the decision. */
  terms: EmailTerm[]
  payment?: EmailPaymentSummaryProps
}

export function ChangeRequestDecisionEmail({
  explanation,
  terms,
  payment,
  ...layout
}: ChangeRequestDecisionEmailProps) {
  return (
    <EmailLayout {...layout}>
      <p className="text-base">{explanation}</p>
      <EmailTermList
        title="Platný stav"
        terms={terms}
      />
      {payment ? <EmailPaymentSummary {...payment} /> : null}
    </EmailLayout>
  )
}
