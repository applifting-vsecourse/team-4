import { EmailLayout, type EmailLayoutProps } from "@/features/notifications/components/EmailLayout"
import {
  EmailPaymentSummary,
  type EmailPaymentSummaryProps,
} from "@/features/notifications/components/EmailPaymentSummary"
import { EmailTermList, type EmailTerm } from "@/features/notifications/components/EmailTermList"

// E-mail after a saved change of a registration, a term or participation, or after a
// batch evaluation (F45-1). Design only: every value is passed in.

export type RegistrationUpdateEmailProps = Omit<EmailLayoutProps, "children"> & {
  /** What happened, in one or two sentences. */
  explanation: string
  terms: EmailTerm[]
  /** Omitted when the registration has nothing to pay. */
  payment?: EmailPaymentSummaryProps
}

export function RegistrationUpdateEmail({
  explanation,
  terms,
  payment,
  ...layout
}: RegistrationUpdateEmailProps) {
  return (
    <EmailLayout {...layout}>
      <p className="text-base">{explanation}</p>
      <EmailTermList
        title="Vaše termíny"
        terms={terms}
      />
      {payment ? <EmailPaymentSummary {...payment} /> : null}
    </EmailLayout>
  )
}
