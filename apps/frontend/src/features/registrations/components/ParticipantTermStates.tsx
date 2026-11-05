import { Badge } from "@/components/ui/badge"

export type ParticipantTermState = "confirmed" | "pending" | "waitlisted"

export type ParticipantTermStatesItem = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027 · 4 800 Kč". */
  details: string
  state: ParticipantTermState
}

const STATE_BADGE: Record<
  ParticipantTermState,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  confirmed: { label: "Potvrzeno", variant: "success" },
  pending: { label: "Čeká na rozhodnutí organizátora", variant: "secondary" },
  waitlisted: { label: "Náhradník", variant: "warning" },
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
          <Badge variant={STATE_BADGE[term.state].variant}>{STATE_BADGE[term.state].label}</Badge>
        </li>
      ))}
    </ul>
  )
}
