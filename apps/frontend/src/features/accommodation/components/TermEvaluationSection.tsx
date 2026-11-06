import { useEffect, useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"
import { formatPragueDateTime } from "@/lib/date"

import {
  evaluationKeys,
  runEvidenceQueryOptions,
  termEvaluationQueryOptions,
  termRunsQueryOptions,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { EvaluationHistory } from "@/features/accommodation/components/EvaluationHistory"
import { RetryAlert } from "@/features/accommodation/components/RetryAlert"
import { RunEvidenceSheet } from "@/features/accommodation/components/RunEvidenceSheet"
import {
  TermEvaluation,
  type OrderPerson,
} from "@/features/accommodation/components/TermEvaluation"
import { useRecalculate } from "@/features/accommodation/hooks/useRecalculate"
import {
  attributeLabel,
  toCapacity,
  toConflict,
  toEvaluationTerm,
  toEvidence,
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

// Přihlášky → Vyhodnocení (S3-01): the proposal of the selected term, its
// queues and order, the history of its runs with their evidence. Reading
// never evaluates; "Přepočítat" queues a run and the term is read again
// until it is stored. Confirming, waitlisting and moving come with later
// slices, so they are not offered.
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
  // A run stored while the term was polled belongs into the history.
  const settled = `${evaluation.data?.status}/${evaluation.data?.proposalRun?.id}`
  useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: evaluationKeys.runs(organizationId, eventId, termId),
    })
  }, [queryClient, organizationId, eventId, termId, settled])
  const recalculate = useRecalculate(organizationId, eventId, termId)
  const [openRunId, setOpenRunId] = useState<string | null>(null)
  const evidence = useQuery({
    ...runEvidenceQueryOptions(organizationId, eventId, openRunId ?? ""),
    enabled: openRunId !== null,
  })

  if (terms.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Akce zatím nemá žádný termín</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  const selectedTerm = terms.find((term) => term.id === termId)
  const common = {
    terms: terms.map(toEvaluationTerm),
    selectedTermId: termId,
    onSelectTerm: (next: string) => onSelect({ termId: next, queue: "all" }),
    selectedQueue: queue,
    onSelectQueue: (next: string) => onSelect({ termId, queue: next }),
  }

  if (evaluation.isPending) {
    return (
      <Skeleton
        className="h-64 w-full"
        role="status"
        aria-label="Načítání vyhodnocení termínu"
      />
    )
  }

  // A failed poll keeps what was shown; only a term never loaded is an error.
  if (evaluation.isError && !evaluation.data) {
    return (
      <TermEvaluation
        {...common}
        mode="automatic"
        status="none"
        attribute={null}
        capacity={{
          confirmed: 0,
          pending: 0,
          waitlisted: 0,
          hasRooms: false,
          baseBeds: 0,
          extraBeds: 0,
        }}
        queues={[]}
        people={[]}
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
  const recalculateError = recalculate.isError
    ? (readApiError(recalculate.error).message ?? RECALCULATE_FAILED)
    : undefined

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
      >
        <EvaluationHistory
          title="Historie termínu"
          entries={(runs.data ?? []).map((run) =>
            toHistoryRun(run, selectedTerm?.label ?? data.term.label),
          )}
          isLoadFailed={runs.isError}
          onRetry={() => void runs.refetch()}
          onOpenRun={setOpenRunId}
        />
        {evidence.isError ? (
          <RetryAlert
            title="Doklad se nepodařilo načíst"
            onRetry={() => void evidence.refetch()}
          />
        ) : null}
      </TermEvaluation>
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
