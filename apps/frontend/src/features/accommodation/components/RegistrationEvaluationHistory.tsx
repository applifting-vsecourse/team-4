import { useQuery } from "@tanstack/react-query"

import { Skeleton } from "@/components/ui/skeleton"
import { formatPragueDateTime } from "@/lib/date"

import { registrationAccommodationQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { EvaluationHistory } from "@/features/accommodation/components/EvaluationHistory"
import { valueLabel } from "@/features/accommodation/lib/evaluationView"

type RegistrationEvaluationHistoryProps = {
  organizationId: string
  eventId: string
  registrationId: string
  person: string
}

// Detail přihlášky → Historie vyhodnocení (F39-1): the immutable record of the
// determinations of this registration, newest first. Decisions join it with
// a later slice.
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
  const attribute = accommodation.data?.hardAttribute?.attribute ?? "gender"
  return (
    <EvaluationHistory
      title="Historie vyhodnocení"
      isLoadFailed={accommodation.isError}
      onRetry={() => void accommodation.refetch()}
      entries={(accommodation.data?.history ?? []).map((record) => ({
        kind: "determination",
        id: record.id,
        at: formatPragueDateTime(record.createdAt),
        author: record.actor.name,
        person,
        answer: valueLabel(attribute, record.answer),
        value: valueLabel(attribute, record.value),
        reason: record.reason,
      }))}
    />
  )
}
