import { Money } from "@/components/Money"
import { ParticipationBadge } from "@/components/ParticipationBadge"
import { formatCalendarRange } from "@/lib/date"

import { type ParticipantTerm } from "@/features/registrations/api/participantRegistrationSchemas"

// Every selected term with its own status, so a mixed registration reads the
// same as any other (S2-14).
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
              <Money minor={term.priceMinor} />
            </p>
          </div>
          <ParticipationBadge status={term.status} />
        </li>
      ))}
    </ul>
  )
}
