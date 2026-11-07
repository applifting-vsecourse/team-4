import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { readApiError, type ApiErrorCode } from "@/lib/apiError"

import { termEvaluationQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { type TermEvaluationData } from "@/features/accommodation/api/evaluationSchemas"
import {
  QueueMoveDialog,
  type QueueMoveEntry,
  type QueueMoveStep,
} from "@/features/accommodation/components/QueueMoveDialog"
import { useMoveInQueue } from "@/features/accommodation/hooks/useMoveInQueue"
import { queueLabel } from "@/features/accommodation/lib/evaluationView"

type Placement = "before" | "after"
type OrderEntry = TermEvaluationData["order"][number]

type MoveInQueueDialogProps = {
  organizationId: string
  eventId: string
  /** The term as shown; its order and version are what the organizer saw. */
  term: TermEvaluationData
  registrationId: string
  onClose: () => void
}

/** The server's limit of the reason. */
const REASON_MAX_LENGTH = 500

const nameOf = (entry: OrderEntry) => `${entry.firstName} ${entry.lastName}`

/** The queue of the person: everyone unconfirmed without a hard attribute. */
export function queueOf(term: TermEvaluationData, registrationId: string): OrderEntry[] {
  const person = term.order.find((entry) => entry.registrationId === registrationId)
  if (!person) return []
  if (!term.hardAttribute) return term.order
  if (person.effectiveValue === null) return []
  return term.order.filter((entry) => entry.effectiveValue === person.effectiveValue)
}

/** Whether the person can be placed next to anyone: unconfirmed, in a queue of two or more. */
export const isMovable = (term: TermEvaluationData, registrationId: string) =>
  queueOf(term, registrationId).length > 1

/** The queue after placing the person right before or after the target. */
export function movedQueue(
  queue: readonly OrderEntry[],
  registrationId: string,
  targetId: string,
  placement: Placement,
): OrderEntry[] {
  const moved = queue.find((entry) => entry.registrationId === registrationId)
  const rest = queue.filter((entry) => entry.registrationId !== registrationId)
  const index = rest.findIndex((entry) => entry.registrationId === targetId)
  if (!moved || index < 0) return [...queue]
  rest.splice(placement === "before" ? index : index + 1, 0, moved)
  return rest
}

const toEntries = (queue: readonly OrderEntry[]): QueueMoveEntry[] =>
  queue.map((entry) => ({ id: entry.registrationId, label: nameOf(entry) }))

/** Refusals of the target; the rest of the entry stays for a correction. */
const TARGET_CODES = new Set<ApiErrorCode>(["target_invalid", "order_unchanged"])

// Změnit pořadí (S3-03, F39-1; spec v4 §6), from the order of a term: where
// to place the person and why, then the original and the new queue before
// saving. The version the organizer saw goes with the move, so a change of
// the queue meanwhile refuses it; the current queue is loaded for a new
// confirmation. A retry after a failed write sends the same move, which the
// server records once.
export function MoveInQueueDialog({
  organizationId,
  eventId,
  term,
  registrationId,
  onClose,
}: MoveInQueueDialogProps) {
  const queryClient = useQueryClient()
  const move = useMoveInQueue(organizationId, eventId, term.term.id)
  const [seenVersion, setSeenVersion] = useState(term.inputVersion)
  const [step, setStep] = useState<"form" | "review">("form")
  const [placement, setPlacement] = useState<Placement>("before")
  const [targetId, setTargetId] = useState<string | undefined>(undefined)
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<{ target?: string; reason?: string }>({})
  const [outcome, setOutcome] = useState<"stale" | "failed" | null>(null)
  const [isReloading, setIsReloading] = useState(false)

  const queue = queueOf(term, registrationId)
  const person = queue.find((entry) => entry.registrationId === registrationId)
  const targets = queue.filter((entry) => entry.registrationId !== registrationId)

  const check = () => {
    const trimmed = reason.trim()
    const target = targets.some((entry) => entry.registrationId === targetId) ? targetId : undefined
    const isUnchanged =
      target !== undefined &&
      movedQueue(queue, registrationId, target, placement).every(
        (entry, index) => entry.registrationId === queue[index]?.registrationId,
      )
    const found = {
      target: !target
        ? "Vyberte osobu, před kterou nebo za kterou se má přesunout."
        : isUnchanged
          ? "Osoba už na tomto místě stojí. Pořadí by se nezměnilo."
          : undefined,
      reason: !trimmed
        ? "Uveďte důvod změny pořadí."
        : trimmed.length > REASON_MAX_LENGTH
          ? `Důvod může mít nejvýše ${REASON_MAX_LENGTH} znaků.`
          : undefined,
    }
    setErrors(found)
    if (!found.target && !found.reason) setStep("review")
  }

  const save = () => {
    if (!targetId) return
    setOutcome(null)
    move.mutate(
      {
        registrationId,
        targetId,
        placement,
        reason: reason.trim(),
        expectedVersion: seenVersion,
      },
      {
        onSuccess: () => {
          toast.success("Pořadí bylo uloženo.")
          onClose()
        },
        onError: (error) => {
          const { code, message } = readApiError(error)
          // The person can no longer be moved only because the term changed.
          if (code === "order_stale" || code === "person_not_movable") {
            setOutcome("stale")
          } else if (code && TARGET_CODES.has(code)) {
            // The entry is refused as it is; it stays for a correction.
            setErrors({ target: message ?? "Vyberte jinou osobu téže fronty." })
            setStep("form")
          } else {
            setOutcome("failed")
          }
        },
      },
    )
  }

  const reload = async () => {
    setIsReloading(true)
    try {
      const fresh = await queryClient.fetchQuery({
        ...termEvaluationQueryOptions(organizationId, eventId, term.term.id),
        staleTime: 0,
      })
      if (!isMovable(fresh, registrationId)) {
        // Confirmed, cancelled or alone in the queue now: nothing to place.
        toast.error("Osobu už v této frontě nelze přesunout. Pořadí se nezměnilo.")
        onClose()
        return
      }
      setSeenVersion(fresh.inputVersion)
      setOutcome(null)
      setStep("form")
      move.reset()
    } catch {
      toast.error("Frontu se nepodařilo načíst. Zkuste to prosím znovu.")
    } finally {
      setIsReloading(false)
    }
  }

  const shownStep: QueueMoveStep = move.isPending
    ? "saving"
    : outcome === "stale"
      ? "stale"
      : outcome === "failed"
        ? "failed"
        : step
  const preview = targetId ? movedQueue(queue, registrationId, targetId, placement) : queue

  return (
    <QueueMoveDialog
      isOpen
      step={shownStep}
      personId={registrationId}
      personName={person ? nameOf(person) : ""}
      queueLabel={queueLabel(
        term.term.label,
        term.hardAttribute?.attribute ?? null,
        person?.effectiveValue ?? null,
      )}
      targets={targets.map((entry) => ({
        id: entry.registrationId,
        label: `${entry.position}. ${nameOf(entry)}`,
      }))}
      placement={placement}
      targetId={targetId}
      reason={step === "form" ? reason : reason.trim()}
      targetError={errors.target}
      reasonError={errors.reason}
      originalOrder={toEntries(queue)}
      newOrder={toEntries(preview)}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      onPlacementChange={setPlacement}
      onTargetChange={setTargetId}
      onReasonChange={setReason}
      onContinue={check}
      onSave={save}
      onReload={isReloading ? undefined : () => void reload()}
    />
  )
}
