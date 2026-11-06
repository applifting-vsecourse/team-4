import { useQueries } from "@tanstack/react-query"

import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { termEvaluationQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import {
  TermDecisions,
  type DecisionTerm,
  type DecisionTermState,
} from "@/features/accommodation/components/TermDecisions"
import { attributeLabel } from "@/features/accommodation/lib/evaluationView"
import { reasonText } from "@/features/accommodation/lib/proposal"

type RegistrationTerm = {
  termId: string
  label: string
  startDate: string
  endDate: string
  priceMinor: number
  status: DecisionTermState
}

type RegistrationTermDecisionsProps = {
  organizationId: string
  eventId: string
  registrationId: string
  terms: RegistrationTerm[]
}

// Detail přihlášky → Termíny (F13-1): each term with its own state and the
// person's place in the term's current proposal. Deciding a term comes with a
// later slice, so no decision is offered yet.
export function RegistrationTermDecisions({
  organizationId,
  eventId,
  registrationId,
  terms,
}: RegistrationTermDecisionsProps) {
  // Only an undecided term has a place in a proposal.
  const open = terms.filter((term) => term.status === "pending" || term.status === "waitlisted")
  const evaluations = useQueries({
    queries: open.map((term) => termEvaluationQueryOptions(organizationId, eventId, term.termId)),
  })
  const byTerm = new Map(open.map((term, index) => [term.termId, evaluations[index]?.data]))

  const decisionTerms: DecisionTerm[] = terms.map((term) => {
    // Only a current proposal is shown; a stale one is not the person's place.
    const evaluation = byTerm.get(term.termId)
    const entry =
      evaluation?.status === "current"
        ? evaluation.order.find((person) => person.registrationId === registrationId)
        : undefined
    const attribute = evaluation?.hardAttribute
      ? attributeLabel(evaluation.hardAttribute.attribute)
      : ""
    return {
      id: term.termId,
      label: term.label,
      details: `${formatCalendarRange(term.startDate, term.endDate)} · ${formatCzk(term.priceMinor)}`,
      state: term.status,
      proposal: entry?.result
        ? {
            result: entry.result,
            reason: entry.reason ? reasonText(entry.reason, attribute) : undefined,
          }
        : undefined,
    }
  })

  return <TermDecisions terms={decisionTerms} />
}
