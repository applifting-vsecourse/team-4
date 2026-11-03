import { useQueries } from "@tanstack/react-query"

import { formatCalendarRange } from "@/lib/date"

import { participantProgrammeQueryOptions } from "@/features/programme/api/programmeQueryOptions"
import {
  ParticipantProgramme,
  type ParticipantProgrammeTerm,
} from "@/features/programme/components/ParticipantProgramme"
import { groupByDay } from "@/features/programme/lib/programmeDays"

type ParticipantTermProgrammesProps = {
  registrationId: string
  terms: {
    termId: string
    label: string
    startDate: string
    endDate: string
    status: "confirmed" | "waitlisted"
  }[]
}

// Moje přihlášky → Detail přihlášky → Program termínu (F65). Only a confirmed
// term is requested; a waitlisted one gets an explanation and no request.
export function ParticipantTermProgrammes({
  registrationId,
  terms,
}: ParticipantTermProgrammesProps) {
  const queries = useQueries({
    queries: terms.map((term) => ({
      ...participantProgrammeQueryOptions(registrationId, term.termId),
      enabled: term.status === "confirmed",
    })),
  })

  const rows: ParticipantProgrammeTerm[] = terms.map((term, index) => {
    const query = queries[index]
    return {
      id: term.termId,
      label: term.label,
      dates: formatCalendarRange(term.startDate, term.endDate),
      status: term.status,
      days: groupByDay(query?.data?.items ?? []),
      isLoading: term.status === "confirmed" && Boolean(query?.isPending) && !query?.isError,
      isLoadFailed: Boolean(query?.isError),
      isRetrying: Boolean(query?.isFetching),
    }
  })

  return (
    <ParticipantProgramme
      terms={rows}
      onRetry={(termId) => {
        void queries[terms.findIndex((term) => term.termId === termId)]?.refetch()
      }}
    />
  )
}
