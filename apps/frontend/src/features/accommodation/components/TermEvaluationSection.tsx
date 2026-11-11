import { useEffect, useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { readApiError } from "@/lib/apiError"
import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"

import {
  evaluationKeys,
  runEvidenceQueryOptions,
  termEvaluationQueryOptions,
  termMovesQueryOptions,
  termRunsQueryOptions,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { BulkConfirmationDialog } from "@/features/accommodation/components/BulkConfirmationDialog"
import {
  DeterminationDialog,
  type DeterminationTarget,
} from "@/features/accommodation/components/DeterminationDialog"
import { EvaluationHistory } from "@/features/accommodation/components/EvaluationHistory"
import { isMovable, MoveInQueueDialog } from "@/features/accommodation/components/MoveInQueueDialog"
import {
  ParticipationDecisionDialog,
  type ParticipationDecisionTarget,
} from "@/features/accommodation/components/ParticipationDecisionDialog"
import { RetryAlert } from "@/features/accommodation/components/RetryAlert"
import { RunEvidenceSheet } from "@/features/accommodation/components/RunEvidenceSheet"
import {
  TermEvaluation,
  TermEvaluationFrame,
  type OrderPerson,
  type TermEvaluationProps,
} from "@/features/accommodation/components/TermEvaluation"
import { useConfirmProposal } from "@/features/accommodation/hooks/useConfirmProposal"
import { useRecalculate } from "@/features/accommodation/hooks/useRecalculate"
import {
  attributeLabel,
  toCapacity,
  toConflict,
  toEvaluationTerm,
  toEvidence,
  toHistoryMove,
  toHistoryRun,
  toOrderPeople,
  toQueues,
} from "@/features/accommodation/lib/evaluationView"

type Term = { id: string; label: string; startDate: string; endDate: string }

export type TermEvaluationSectionProps = {
  organizationId: string
  eventId: string
  /** The event's terms, by start. */
  terms: Term[]
  termId: string
  /** "all", a queue id or "manual". */
  queue: string
  onSelect: (selection: { termId: string; queue: string }) => void
  /** The person's name as a link to the registration detail and back. */
  renderName: (person: OrderPerson) => ReactNode
}

const RECALCULATE_FAILED = "Zkuste to prosím znovu."

function participations(count: number) {
  if (count === 1) return "1 účast"
  if (count >= 2 && count <= 4) return `${count} účasti`
  return `${count} účastí`
}

/** The confirmation the organizer is shown: one proposal, one key. */
type BulkAttempt = { runId: string; submissionKey: string; people: string[]; remaining?: string }

// Přihlášky → Vyhodnocení (S3-01): the proposal of the selected term, its
// queues and order, the history of its runs with their evidence, and the
// determination of the accommodation of whoever needs one, the decisions on
// participation (S3-02): confirming the suitable of the current proposal at
// once, or one person at a time, and the manual order of a queue (S3-03).
// Reading never evaluates; "Přepočítat" queues a run and the term is read
// again until it is stored.
export function TermEvaluationSection({
  organizationId,
  eventId,
  terms,
  termId,
  queue,
  onSelect,
  renderName,
}: TermEvaluationSectionProps) {
  const queryClient = useQueryClient()
  const hasTerm = termId !== ""
  const evaluation = useQuery({
    ...termEvaluationQueryOptions(organizationId, eventId, termId),
    enabled: hasTerm,
  })
  const runs = useQuery({
    ...termRunsQueryOptions(organizationId, eventId, termId),
    enabled: hasTerm,
  })
  const moves = useQuery({
    ...termMovesQueryOptions(organizationId, eventId, termId),
    enabled: hasTerm,
  })
  // A run stored while the term was polled belongs into the history.
  const settled = `${evaluation.data?.status}/${evaluation.data?.proposalRun?.id}`
  useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: evaluationKeys.runs(organizationId, eventId, termId),
    })
  }, [queryClient, organizationId, eventId, termId, settled])
  const recalculate = useRecalculate(organizationId, eventId, termId)
  const [openRunId, setOpenRunId] = useState<string | null>(null)
  const [determining, setDetermining] = useState<DeterminationTarget | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [bulk, setBulk] = useState<BulkAttempt | null>(null)
  const [deciding, setDeciding] = useState<ParticipationDecisionTarget | null>(null)
  const [confirmedResult, setConfirmedResult] = useState<string | undefined>()
  const confirmProposal = useConfirmProposal(organizationId, eventId, termId)
  const evidence = useQuery({
    ...runEvidenceQueryOptions(organizationId, eventId, openRunId ?? ""),
    enabled: openRunId !== null,
  })

  if (terms.length === 0) {
    return (
      <TermEvaluationFrame>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Akce zatím nemá žádný termín</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </TermEvaluationFrame>
    )
  }

  const selectedTerm = terms.find((term) => term.id === termId)
  const common = {
    terms: terms.map(toEvaluationTerm),
    selectedTermId: termId,
    onSelectTerm: (next: string) => {
      setConfirmedResult(undefined)
      onSelect({ termId: next, queue: "all" })
    },
    selectedQueue: queue,
    onSelectQueue: (next: string) => onSelect({ termId, queue: next }),
  }

  // Nothing of the term is known yet: only its tabs, so another term can be picked.
  const unknownTerm = {
    ...common,
    mode: "automatic",
    status: "none",
    attribute: null,
    capacity: {
      confirmed: 0,
      pending: 0,
      waitlisted: 0,
      hasRooms: false,
      baseBeds: 0,
      extraBeds: 0,
    },
    queues: [],
    people: [],
  } satisfies TermEvaluationProps

  if (evaluation.isPending) {
    return (
      <TermEvaluation
        {...unknownTerm}
        isLoading
      />
    )
  }

  // A failed poll keeps what was shown; only a term never loaded is an error.
  if (evaluation.isError && !evaluation.data) {
    return (
      <TermEvaluation
        {...unknownTerm}
        isLoadFailed
        onRetryLoad={() => void evaluation.refetch()}
      />
    )
  }

  const data = evaluation.data
  if (!data) return null
  // A queue the term no longer has (an old link) shows the whole term.
  const queueIds = new Set([
    "all",
    ...data.queues.map((q) => q.value ?? "everyone"),
    ...(data.manualCount > 0 ? ["manual"] : []),
  ])
  const shownQueue = queueIds.has(queue) ? queue : "all"
  // Runs and order changes, newest first: the moves a run used come before it.
  const termLabel = selectedTerm?.label ?? data.term.label
  const history = [
    ...(runs.data ?? []).map((run) => ({
      time: Date.parse(run.finishedAt),
      entry: toHistoryRun(run, termLabel),
    })),
    ...(moves.data ?? []).map((move) => ({
      time: Date.parse(move.createdAt),
      entry: toHistoryMove(move, data.hardAttribute?.attribute ?? null),
    })),
  ]
    .sort((a, b) => b.time - a.time)
    .map(({ entry }) => entry)
  const recalculateError = recalculate.isError
    ? (readApiError(recalculate.error).message ?? RECALCULATE_FAILED)
    : undefined

  const termName = `${data.term.label}, ${formatCalendarRange(data.term.startDate, data.term.endDate)}`
  const suitableNames = data.order
    .filter((entry) => entry.result === "suitable")
    .map((entry) => `${entry.firstName} ${entry.lastName}`)
  const proposal = data.capacity.proposal
  const remaining = [
    proposal && proposal.unsuitable > 0 ? `${proposal.unsuitable} neubytovatelní` : null,
    proposal && proposal.manual > 0 ? `${proposal.manual} ruční určení` : null,
  ]
    .filter(Boolean)
    .join(", ")
  const bulkError = confirmProposal.isError ? readApiError(confirmProposal.error) : null
  const isBulkStale =
    bulkError?.code === "proposal_stale" ||
    bulkError?.code === "proposal_unavailable" ||
    bulkError?.code === "nothing_to_confirm"
  const closeBulk = () => {
    confirmProposal.reset()
    setBulk(null)
  }

  // Confirming someone without an effective value determines it in the same step.
  const openDecision = (person: OrderPerson, decision: "confirm" | "waitlist") => {
    const entry = data.order.find((e) => e.registrationId === person.id)
    if (!entry) return
    setDeciding({
      termId,
      term: termName,
      registrationId: entry.registrationId,
      person: person.name,
      decision,
      determination:
        decision === "confirm" && data.hardAttribute && entry.effectiveValue === null
          ? { hardAttribute: data.hardAttribute, answer: entry.answer }
          : undefined,
    })
  }

  return (
    <>
      <TermEvaluation
        {...common}
        mode={data.mode}
        // While the request is on its way the term already reads as running.
        status={recalculate.isPending ? "running" : data.status}
        evaluatedAt={
          data.proposalRun ? formatPragueDateTime(data.proposalRun.finishedAt) : undefined
        }
        conflict={toConflict(data)}
        attribute={data.hardAttribute ? attributeLabel(data.hardAttribute.attribute) : null}
        capacity={toCapacity(data)}
        queues={toQueues(data)}
        people={toOrderPeople(data)}
        onRecalculate={() => recalculate.mutate()}
        recalculateError={recalculateError}
        renderName={renderName}
        selectedQueue={shownQueue}
        confirmedResult={confirmedResult}
        onConfirmAll={() => {
          if (!data.proposalRun) return
          // The list is frozen with the run it belongs to.
          setBulk({
            runId: data.proposalRun.id,
            submissionKey: crypto.randomUUID(),
            people: suitableNames,
            remaining: remaining || undefined,
          })
        }}
        decisions={{
          onConfirm: (person) => openDecision(person, "confirm"),
          onWaitlist: (person) => openDecision(person, "waitlist"),
          onDetermine: data.hardAttribute
            ? (person) => {
                const entry = data.order.find((e) => e.registrationId === person.id)
                if (!entry) return
                setDetermining({
                  registrationId: entry.registrationId,
                  person: person.name,
                  answer: entry.answer,
                  current: entry.determinedValue,
                })
              }
            : undefined,
          // Only someone who can stand next to another person of the queue.
          canMove: (person) => isMovable(data, person.id),
          onMove: (person) => setMovingId(person.id),
        }}
      >
        <EvaluationHistory
          title="Historie termínu"
          entries={history}
          isLoadFailed={runs.isError || moves.isError}
          onRetry={() => {
            if (runs.isError) void runs.refetch()
            if (moves.isError) void moves.refetch()
          }}
          onOpenRun={setOpenRunId}
        />
        {evidence.isError ? (
          <RetryAlert
            title="Doklad se nepodařilo načíst"
            onRetry={() => void evidence.refetch()}
          />
        ) : null}
      </TermEvaluation>
      {movingId ? (
        <MoveInQueueDialog
          organizationId={organizationId}
          eventId={eventId}
          term={data}
          registrationId={movingId}
          onClose={() => setMovingId(null)}
        />
      ) : null}
      <BulkConfirmationDialog
        isOpen={bulk !== null}
        state={
          isBulkStale
            ? "stale"
            : bulkError
              ? "failed"
              : confirmProposal.isPending
                ? "saving"
                : "review"
        }
        term={termName}
        people={bulk?.people ?? []}
        remaining={bulk?.remaining}
        staleReason={isBulkStale ? (bulkError?.message ?? undefined) : undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeBulk())}
        onReload={closeBulk}
        onConfirm={() => {
          if (!bulk) return
          confirmProposal.mutate(
            { runId: bulk.runId, submissionKey: bulk.submissionKey },
            {
              onSuccess: (result) => {
                setConfirmedResult(
                  `Potvrzeno ${participations(result.confirmed.length)} v termínu ${data.term.label}.`,
                )
                closeBulk()
              },
            },
          )
        }}
      />
      {deciding ? (
        <ParticipationDecisionDialog
          organizationId={organizationId}
          eventId={eventId}
          target={deciding}
          onClose={() => setDeciding(null)}
        />
      ) : null}
      {determining && data.hardAttribute ? (
        <DeterminationDialog
          organizationId={organizationId}
          eventId={eventId}
          hardAttribute={data.hardAttribute}
          target={determining}
          onClose={() => setDetermining(null)}
        />
      ) : null}
      {evidence.data ? (
        <RunEvidenceSheet
          isOpen={openRunId !== null}
          onOpenChange={(isOpen) => (isOpen ? undefined : setOpenRunId(null))}
          {...toEvidence(evidence.data)}
        />
      ) : null}
    </>
  )
}
