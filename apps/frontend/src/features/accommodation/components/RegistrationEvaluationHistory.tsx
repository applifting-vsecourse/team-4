import { useQuery } from "@tanstack/react-query"

import { Skeleton } from "@/components/ui/skeleton"
import { formatPragueDateTime } from "@/lib/date"

import { registrationAccommodationQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { EvaluationHistory } from "@/features/accommodation/components/EvaluationHistory"
import { toHistoryMove, valueLabel } from "@/features/accommodation/lib/evaluationView"

type RegistrationEvaluationHistoryProps = {
  organizationId: string
  eventId: string
  registrationId: string
  person: string
}

// Detail přihlášky → Historie vyhodnocení (F39-1): the immutable record of the
// determinations of this registration and its moves in the terms' orders
// (S3-03), newest first. Decisions join it with slice 2.
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
      <Skeleton
        className="h-32 w-full"
        role="status"
        aria-label="Načítání historie vyhodnocení"
      />
    )
  }
  const hard = accommodation.data?.hardAttribute ?? null
  const attribute = hard?.attribute ?? "gender"
  const determinations = (accommodation.data?.history ?? []).map((record) => ({
    time: Date.parse(record.createdAt),
    entry: {
      kind: "determination" as const,
      id: record.id,
      at: formatPragueDateTime(record.createdAt),
      author: record.actor.name,
      person,
      answer: valueLabel(attribute, record.answer),
      value: valueLabel(attribute, record.value),
      reason: record.reason,
    },
  }))
  const moves = (accommodation.data?.moves ?? []).map((move) => ({
    time: Date.parse(move.createdAt),
    entry: toHistoryMove(move, hard?.attribute ?? null),
  }))
  return (
    <EvaluationHistory
      title="Historie vyhodnocení"
      isLoadFailed={accommodation.isError}
      onRetry={() => void accommodation.refetch()}
      entries={[...determinations, ...moves]
        .sort((a, b) => b.time - a.time)
        .map(({ entry }) => entry)}
    />
  )
}
