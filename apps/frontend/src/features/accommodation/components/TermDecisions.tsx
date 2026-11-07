import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { RESULT_BADGE, type ProposalResult } from "@/features/accommodation/lib/proposal"

export type DecisionTermState = "confirmed" | "pending" | "waitlisted" | "cancelled"

export type DecisionTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027 · 4 800 Kč". */
  details: string
  state: DecisionTermState
  /** The person in the term's current proposal (F13-1); missing when confirmed or without one. */
  proposal?: { result: ProposalResult; reason?: string }
}

const STATE_BADGE: Record<
  DecisionTermState,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  confirmed: { label: "Potvrzeno", variant: "success" },
  pending: { label: "Čeká na rozhodnutí", variant: "secondary" },
  waitlisted: { label: "Náhradník", variant: "warning" },
  cancelled: { label: "Odhlášeno", variant: "secondary" },
}

/** F14-1, a later slice: without them no decision is offered. */
export type TermDecisionHandlers = {
  onConfirm?: (term: DecisionTerm) => void
  onWaitlist?: (term: DecisionTerm) => void
}

// Správa akce → Přihlášky → detail přihlášky → Termíny (F14-1): each term with
// its own state and the decision still open for it. A confirmed term offers
// no decision, confirmed people are not moved. Design only: every value is
// passed in.
export function TermDecisions({
  terms,
  onConfirm,
  onWaitlist,
}: { terms: DecisionTerm[] } & TermDecisionHandlers) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Termíny</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border text-sm">
          {terms.map((term) => (
            <li
              key={term.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium wrap-break-word">{term.label}</p>
                  <Badge variant={STATE_BADGE[term.state].variant}>
                    {STATE_BADGE[term.state].label}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{term.details}</p>
                {term.proposal ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Návrh:</span>
                    <Badge variant={RESULT_BADGE[term.proposal.result].variant}>
                      {RESULT_BADGE[term.proposal.result].label}
                    </Badge>
                    {term.proposal.reason ? <span>{term.proposal.reason}</span> : null}
                  </div>
                ) : null}
              </div>
              {term.state === "confirmed" || term.state === "cancelled" ? null : (
                <div className="flex flex-wrap justify-end gap-2">
                  {term.state === "pending" && onWaitlist ? (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Zařadit mezi náhradníky: ${term.label}`}
                      onClick={() => onWaitlist(term)}
                    >
                      Náhradník
                    </Button>
                  ) : null}
                  {onConfirm ? (
                    <Button
                      size="sm"
                      aria-label={`Potvrdit účast: ${term.label}`}
                      onClick={() => onConfirm(term)}
                    >
                      Potvrdit
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
