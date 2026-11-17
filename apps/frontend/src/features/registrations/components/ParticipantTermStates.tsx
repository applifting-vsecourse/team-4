import { ParticipationBadge } from "@/components/ParticipationBadge"
import { type TermParticipation } from "@/lib/participation"

export type ParticipantTermStatesItem = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027 · 4 800 Kč". */
  details: string
  state: Exclude<TermParticipation, "cancelled">
}

// Výsledek odeslání přihlášky and Moje přihlášky → Detail přihlášky → Termíny
// (F13-1, F14-1): each term with its own state, including the new pending
// state until the organizer decides. The design of ParticipantTermList with
// "pending" added. Design only: every value is passed in.
export function ParticipantTermStates({ terms }: { terms: ParticipantTermStatesItem[] }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {terms.map((term) => (
        <li
          key={term.id}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium wrap-break-word">{term.label}</p>
            <p className="text-muted-foreground">{term.details}</p>
          </div>
          <ParticipationBadge status={term.state} />
        </li>
      ))}
    </ul>
  )
}
