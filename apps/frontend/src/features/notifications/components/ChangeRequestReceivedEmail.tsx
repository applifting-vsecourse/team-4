import { EmailLayout, type EmailLayoutProps } from "@/features/notifications/components/EmailLayout"
import { EmailTermList, type EmailTerm } from "@/features/notifications/components/EmailTermList"

// E-mail confirming that a change request awaits approval (F45-1). Design only: every
// value is passed in. It separates the proposal from the data that still apply.

export type ChangeRequestReceivedEmailProps = Omit<EmailLayoutProps, "children"> & {
  explanation: string
  /** The terms as they are valid now. */
  currentTerms: EmailTerm[]
  /** The terms as proposed; all carry the status "pending". */
  proposedTerms: EmailTerm[]
}

export function ChangeRequestReceivedEmail({
  explanation,
  currentTerms,
  proposedTerms,
  ...layout
}: ChangeRequestReceivedEmailProps) {
  return (
    <EmailLayout {...layout}>
      <p className="text-base">{explanation}</p>
      <EmailTermList
        title="Stále platí"
        terms={currentTerms}
      />
      <EmailTermList
        title="Navrhovaná změna"
        terms={proposedTerms}
      />
    </EmailLayout>
  )
}
