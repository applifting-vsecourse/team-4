import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Participant e-mails (F45-1). Design only: one row per chosen term with its own status.

export type EmailTermStatus = "confirmed" | "waitlisted" | "pending" | "cancelled"

export type EmailTerm = {
  id: string
  name: string
  dates: string
  status: EmailTermStatus
}

const LABELS: Record<EmailTermStatus, string> = {
  confirmed: "Potvrzeno",
  waitlisted: "Náhradník",
  pending: "Čeká na schválení",
  cancelled: "Odhlášeno",
}

const VARIANTS = {
  confirmed: "success",
  waitlisted: "warning",
  pending: "outline",
  cancelled: "secondary",
} as const satisfies Record<EmailTermStatus, string>

export type EmailTermListProps = {
  title: string
  terms: EmailTerm[]
}

export function EmailTermList({ title, terms }: EmailTermListProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-h4">{title}</h2>
      <ul>
        {terms.map((term, index) => (
          <li key={term.id}>
            {index > 0 ? <Separator /> : null}
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{term.name}</p>
                <p className="text-sm text-muted-foreground">{term.dates}</p>
              </div>
              <Badge variant={VARIANTS[term.status]}>{LABELS[term.status]}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
