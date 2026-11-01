import { TermStateBadge, type TermState } from "@/features/registrations/components/ChangeSummary"

export type TermStateRow = {
  id: string
  label: string
  /** Already formatted, e.g. "20. 11. – 22. 11. 2026 · 2 400 Kč". */
  details: string
  state: TermState
}

// Moje přihlášky → Detail přihlášky → Termíny (F35-2a): every term of the
// registration with its participation, released terms included, so history
// stays visible after a cancellation. Design only: every value is passed in.
export function RegistrationTermStates({ terms }: { terms: TermStateRow[] }) {
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
          <TermStateBadge state={term.state} />
        </li>
      ))}
    </ul>
  )
}
