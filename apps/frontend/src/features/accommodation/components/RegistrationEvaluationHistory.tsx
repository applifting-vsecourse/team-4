import { useQuery } from "@tanstack/react-query"

import { LoadingBlock } from "@/components/LoadingBlock"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPragueDateTime } from "@/lib/date"

import { registrationAccommodationQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import {
  EvaluationHistory,
  type HistoryEntry,
} from "@/features/accommodation/components/EvaluationHistory"
import { toHistoryMove, valueLabel } from "@/features/accommodation/lib/evaluationView"

const STATE_LABELS = {
  pending: "Čeká na rozhodnutí",
  confirmed: "Potvrzeno",
  waitlisted: "Náhradník",
  cancelled: "Odhlášeno",
} as const

type RegistrationEvaluationHistoryProps = {
  organizationId: string
  eventId: string
  registrationId: string
  person: string
}

// Detail přihlášky → Historie vyhodnocení (F39-1): the immutable record of the
// determinations, the decisions on participation and the moves in the terms'
// orders (S3-03) of this registration, newest first.
export function RegistrationEvaluationHistory({
  organizationId,
  eventId,
  registrationId,
  person,
}: RegistrationEvaluationHistoryProps) {
  const accommodation = useQuery(
    registrationAccommodationQueryOptions(organizationId, eventId, registrationId),
  )
  if (accommodation.isPending) {
    return (
      <LoadingBlock label="Načítání historie vyhodnocení">
        <Skeleton className="h-32 w-full" />
      </LoadingBlock>
    )
  }
  const hard = accommodation.data?.hardAttribute ?? null
  const attribute = hard?.attribute ?? "gender"
  return (
    <EvaluationHistory
      title="Historie vyhodnocení"
      isLoadFailed={accommodation.isError}
      onRetry={() => void accommodation.refetch()}
      entries={[
        ...(accommodation.data?.history ?? []).map((record): HistoryEntry & { sortAt: string } => ({
          kind: "determination",
          id: record.id,
          sortAt: record.createdAt,
          at: formatPragueDateTime(record.createdAt),
          author: record.actor.name,
          person,
          answer: valueLabel(attribute, record.answer),
          value: valueLabel(attribute, record.value),
          reason: record.reason,
        })),
        ...(accommodation.data?.decisions ?? []).map(
          (record): HistoryEntry & { sortAt: string } => ({
            kind: "decision",
            id: record.id,
            sortAt: record.createdAt,
            at: formatPragueDateTime(record.createdAt),
            author: record.actor.name,
            person,
            termLabel: record.termLabel,
            fromState: STATE_LABELS[record.from],
            toState: STATE_LABELS[record.to],
            basis: record.run
              ? `Hromadně z návrhu z ${formatPragueDateTime(record.run.finishedAt)} (${record.batchSize} ${record.batchSize === 1 ? "osoba" : "osob"})`
              : "Jednotlivé rozhodnutí organizátora",
          }),
        ),
        ...(accommodation.data?.moves ?? []).map((move): HistoryEntry & { sortAt: string } => ({
          ...toHistoryMove(move, hard?.attribute ?? null),
          sortAt: move.createdAt,
        })),
        // The newest first, across every record.
      ].sort((a, b) => b.sortAt.localeCompare(a.sortAt))}
    />
  )
}
