import { EmailLayout, type EmailLayoutProps } from "@/features/notifications/components/EmailLayout"
import {
  EmailPaymentSummary,
  type EmailPaymentSummaryProps,
} from "@/features/notifications/components/EmailPaymentSummary"
import { EmailTermList, type EmailTerm } from "@/features/notifications/components/EmailTermList"

// E-mail confirming a recorded payment, manual or simulated (F45-1). Design only: every
// value is passed in. The payment never changes the confirmation of participation.

export type PaymentRecordedEmailProps = Omit<EmailLayoutProps, "children"> & {
  explanation: string
  terms: EmailTerm[]
  payment: EmailPaymentSummaryProps
}

export function PaymentRecordedEmail({
  explanation,
  terms,
  payment,
  ...layout
}: PaymentRecordedEmailProps) {
  return (
    <EmailLayout {...layout}>
      <p className="text-base">{explanation}</p>
      <EmailPaymentSummary {...payment} />
      <EmailTermList
        title="Vaše termíny"
        terms={terms}
      />
    </EmailLayout>
  )
}
