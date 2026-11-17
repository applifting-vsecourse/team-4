import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarX } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { readApiError } from "@/lib/apiError"
import { formatPragueDateTime } from "@/lib/date"

import { termRoomProposalQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import {
  RoomProposal,
  RoomProposalFrame,
  type RoomProposalProps,
} from "@/features/accommodation/components/RoomProposal"
import { useProposeRooms } from "@/features/accommodation/hooks/useProposeRooms"
import { toEvaluationTerm } from "@/features/accommodation/lib/evaluationView"
import { toProposalLayout } from "@/features/accommodation/lib/roomProposalView"

type Term = { id: string; label: string; startDate: string; endDate: string }

export type RoomProposalSectionProps = {
  organizationId: string
  eventId: string
  /** The event's terms, by start. */
  terms: Term[]
  termId: string
  onSelectTerm: (termId: string) => void
}

const PROPOSE_FAILED = "Zkuste to prosím znovu."

// Ubytování → Návrh pokojů (#385): the room proposal of the selected term.
// Reading never proposes; "Navrhnout pokoje" queues a proposal and the term
// is read again until it is stored. The last usable proposal stays shown
// while a new one runs or after one fails.
export function RoomProposalSection({
  organizationId,
  eventId,
  terms,
  termId,
  onSelectTerm,
}: RoomProposalSectionProps) {
  const hasTerm = termId !== ""
  const proposal = useQuery({
    ...termRoomProposalQueryOptions(organizationId, eventId, termId),
    enabled: hasTerm,
    placeholderData: keepPreviousData,
  })
  const propose = useProposeRooms(organizationId, eventId, termId)

  if (terms.length === 0) {
    return (
      <RoomProposalFrame>
        <EmptyState
          icon={CalendarX}
          title="Akce zatím nemá žádný termín"
        />
      </RoomProposalFrame>
    )
  }

  const common = {
    terms: terms.map(toEvaluationTerm),
    selectedTermId: termId,
    onSelectTerm: (next: string) => {
      propose.reset()
      onSelectTerm(next)
    },
  }
  const unknownTerm = { ...common, mode: "manual", status: "none" } satisfies RoomProposalProps

  if (proposal.isPending) {
    return (
      <RoomProposal
        {...unknownTerm}
        isLoading
      />
    )
  }
  // A failed poll keeps what was shown; only a term never loaded is an error.
  if (proposal.isError && !proposal.data) {
    return (
      <RoomProposal
        {...unknownTerm}
        isLoadFailed
        onRetryLoad={() => void proposal.refetch()}
      />
    )
  }
  const data = proposal.data
  if (!data) return null
  const shown = data.lastSolved

  return (
    <RoomProposal
      {...common}
      isSwitching={proposal.isPlaceholderData}
      mode={data.mode}
      // While the request is on its way the term already reads as running.
      status={propose.isPending ? "running" : data.status}
      layout={shown?.layout ? toProposalLayout(shown.layout) : undefined}
      proposedAt={shown ? formatPragueDateTime(shown.finishedAt) : undefined}
      onPropose={() => propose.mutate()}
      proposeError={
        propose.isError ? (readApiError(propose.error).message ?? PROPOSE_FAILED) : undefined
      }
    />
  )
}
