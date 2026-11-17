import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PARTICIPATION_LABELS, type TermParticipation } from "@/lib/participation"

// Participant e-mails (F45-1). Design only: one row per chosen term with its own status.

export type EmailTerm = {
  id: string
  name: string
  dates: string
  status: TermParticipation
}

// The e-mail keeps its own badge colours: a pending term is outlined.
const VARIANTS = {
  confirmed: "success",
  waitlisted: "warning",
  pending: "outline",
  cancelled: "secondary",
} as const satisfies Record<TermParticipation, string>

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
              <Badge variant={VARIANTS[term.status]}>{PARTICIPATION_LABELS[term.status]}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
