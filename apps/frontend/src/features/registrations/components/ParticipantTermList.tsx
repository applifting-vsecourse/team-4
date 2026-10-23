import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type ParticipantTerm } from "@/features/registrations/api/participantRegistrationSchemas"
import { ParticipationBadge } from "@/features/registrations/components/ParticipationBadge"

// Every selected term with its own status, so a mixed registration reads the
// same as any other (S2-14, Wireframy M2/M3).
export function ParticipantTermList({ terms }: { terms: ParticipantTerm[] }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {terms.map((term) => (
        <li
          key={term.termId}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium wrap-break-word">{term.label}</p>
            <p className="text-muted-foreground">
              {formatCalendarRange(term.startDate, term.endDate)} ·{" "}
              <span className="font-mono">{formatCzk(term.priceMinor)}</span>
            </p>
          </div>
          <ParticipationBadge status={term.status} />
        </li>
      ))}
    </ul>
  )
}
