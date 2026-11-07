import { useState } from "react"
import { toast } from "sonner"

import { readApiError, type ApiErrorCode } from "@/lib/apiError"

import { TermDecisionDialog } from "@/features/accommodation/components/TermDecisionDialog"
import { useDecideParticipation } from "@/features/accommodation/hooks/useDecideParticipation"
import { valueLabel } from "@/features/accommodation/lib/evaluationView"

/** The refusals the server explains in its message; the decision was not saved. */
const REFUSALS: ApiErrorCode[] = [
  "no_capacity",
  "incompatible_rooms",
  "not_undecided",
  "already_waitlisted",
  "term_changed",
  "answer_changed",
  "determination_not_needed",
  "no_hard_attribute",
  "registration_unavailable",
]

export type ParticipationDecisionTarget = {
  termId: string
  /** Already formatted, e.g. "1. turnus, 4.–11. 7. 2027". */
  term: string
  registrationId: string
  /** E.g. "Alex Šimek". */
  person: string
  decision: "confirm" | "waitlist"
  /**
   * Confirming a person without an effective value determines it here, in
   * the same step (spec v4 §3). Missing: nothing to determine.
   */
  determination?: {
    hardAttribute: { attribute: string; determiningValues: string[] }
    /** The participant's answer as the API stores it. */
    answer: string | null
  }
}

type ParticipationDecisionDialogProps = {
  organizationId: string
  eventId: string
  target: ParticipationDecisionTarget
  onClose: () => void
  /** Also reloaded after the decision, e.g. the registration detail. */
  invalidate?: readonly unknown[]
}

// Confirm or waitlist one person in one term (F14-1), from a row of the order
// or the registration detail. The key is one per dialog, so a double click or
// a retry after a lost response saves nothing twice.
export function ParticipationDecisionDialog({
  organizationId,
  eventId,
  target,
  onClose,
  invalidate,
}: ParticipationDecisionDialogProps) {
  const decide = useDecideParticipation(
    organizationId,
    eventId,
    target.termId,
    target.registrationId,
    invalidate,
  )
  const [submissionKey] = useState(() => crypto.randomUUID())
  const { determination } = target
  const label = (value: string) =>
    determination ? valueLabel(determination.hardAttribute.attribute, value) : value
  const codeOf = new Map(
    (determination?.hardAttribute.determiningValues ?? []).map((value) => [label(value), value]),
  )

  const error = decide.isError ? readApiError(decide.error) : null
  const isRefused = error?.code != null && REFUSALS.includes(error.code) && error.message !== null

  return (
    <TermDecisionDialog
      isOpen
      decision={target.decision}
      person={target.person}
      term={target.term}
      rejectedReason={isRefused ? (error?.message ?? undefined) : undefined}
      saveError={
        error && !isRefused
          ? "Stav účasti ani platby se nezměnily. Zkuste to prosím znovu."
          : undefined
      }
      determination={
        determination
          ? {
              answer: valueLabel(determination.hardAttribute.attribute, determination.answer),
              values: determination.hardAttribute.determiningValues.map(label),
            }
          : undefined
      }
      isSaving={decide.isPending}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      onSubmit={(entry) =>
        decide.mutate(
          {
            decision: target.decision,
            submissionKey,
            determination:
              entry && determination
                ? {
                    value: codeOf.get(entry.value) ?? entry.value,
                    reason: entry.reason,
                    answer: determination.answer,
                  }
                : undefined,
          },
          {
            onSuccess: () => {
              toast.success(
                target.decision === "confirm"
                  ? "Účast byla potvrzena."
                  : "Osoba byla zařazena mezi náhradníky.",
              )
              onClose()
            },
          },
        )
      }
    />
  )
}
