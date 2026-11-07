import { useState } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"

import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  registrationAccommodationQueryOptions,
  termEvaluationQueryOptions,
} from "@/features/accommodation/api/evaluationQueryOptions"
import {
  ParticipationDecisionDialog,
  type ParticipationDecisionTarget,
} from "@/features/accommodation/components/ParticipationDecisionDialog"
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
  /** E.g. "Alex Šimek". */
  person: string
  terms: RegistrationTerm[]
  /** Reloaded after a decision, i.e. the registration detail with its term states. */
  invalidate: readonly unknown[]
}

// Detail přihlášky → Termíny (F13-1): each term with its own state and the
// person's place in the term's current proposal, and the decision still open
// for it (F14-1). Confirming a person without an effective value determines
// it in the same dialog.
export function RegistrationTermDecisions({
  organizationId,
  eventId,
  registrationId,
  person,
  terms,
  invalidate,
}: RegistrationTermDecisionsProps) {
  const accommodation = useQuery(
    registrationAccommodationQueryOptions(organizationId, eventId, registrationId),
  )
  const [deciding, setDeciding] = useState<ParticipationDecisionTarget | null>(null)
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

  const decide = (term: DecisionTerm, decision: "confirm" | "waitlist") => {
    const source = terms.find((candidate) => candidate.termId === term.id)
    if (!source) return
    const hard = accommodation.data?.hardAttribute
    setDeciding({
      termId: source.termId,
      term: `${source.label}, ${formatCalendarRange(source.startDate, source.endDate)}`,
      registrationId,
      person,
      decision,
      determination:
        decision === "confirm" && hard && accommodation.data?.needsDetermination
          ? { hardAttribute: hard, answer: accommodation.data.answer }
          : undefined,
    })
  }

  return (
    <>
      <TermDecisions
        terms={decisionTerms}
        // Whether the person needs a determination is known only once it is read.
        onConfirm={accommodation.data ? (term) => decide(term, "confirm") : undefined}
        onWaitlist={accommodation.data ? (term) => decide(term, "waitlist") : undefined}
      />
      {deciding ? (
        <ParticipationDecisionDialog
          organizationId={organizationId}
          eventId={eventId}
          target={deciding}
          onClose={() => setDeciding(null)}
          invalidate={invalidate}
        />
      ) : null}
    </>
  )
}
