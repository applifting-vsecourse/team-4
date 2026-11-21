import { useEffect } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarX } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { readApiError } from "@/lib/apiError"
import { formatPragueDateTime } from "@/lib/date"

import { termRoomProposalQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import { ApplyProposalAction } from "@/features/accommodation/components/ApplyProposalAction"
import {
  RoomProposal,
  RoomProposalFrame,
  type RoomProposalProps,
} from "@/features/accommodation/components/RoomProposal"
import { useProposeRooms } from "@/features/accommodation/hooks/useProposeRooms"
import { toEvaluationTerm } from "@/features/accommodation/lib/evaluationView"
import { asApplied, toProposalLayout } from "@/features/accommodation/lib/roomProposalView"

type Term = { id: string; label: string; startDate: string; endDate: string }

export type RoomProposalSectionProps = {
  /** The hard attribute, e.g. "Pohlaví"; for the reason H. */
  attribute?: string | null
  organizationId: string
  eventId: string
  /** The event's terms, by start. */
  terms: Term[]
  /** The term the page's tabs selected; "" when the event has none. */
  termId: string
}

const PROPOSE_FAILED = "Zkuste to prosím znovu."

// Ubytování → Návrh pokojů (#385): the room proposal of the selected term.
// Reading never proposes; "Navrhnout pokoje" queues a proposal and the term
// is read again until it is stored. The last usable proposal stays shown
// while a new one runs or after one fails. "Použít návrh" (#390) saves the
// shown proposal while it is current.
export function RoomProposalSection({
  attribute,
  organizationId,
  eventId,
  terms,
  termId,
}: RoomProposalSectionProps) {
  const hasTerm = termId !== ""
  const proposal = useQuery({
    ...termRoomProposalQueryOptions(organizationId, eventId, termId),
    enabled: hasTerm,
    placeholderData: keepPreviousData,
  })
  const propose = useProposeRooms(organizationId, eventId, termId)
  // A request on its way belongs to the term it was made for, also after Back/Forward.
  const { reset } = propose
  useEffect(() => reset(), [reset, termId])

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
  const proposed = shown?.layout ? toProposalLayout(shown.layout) : undefined
  // Applied and nothing changed since: the saved placements are its rooms.
  const layout = proposed && shown?.appliedAt ? asApplied(proposed) : proposed
  const term = common.terms.find((t) => t.id === termId)

  return (
    <RoomProposal
      {...common}
      attribute={attribute}
      isSwitching={proposal.isPlaceholderData}
      mode={data.mode}
      // While the request is on its way the term already reads as running.
      status={propose.isPending ? "running" : data.status}
      layout={layout}
      proposedAt={shown ? formatPragueDateTime(shown.finishedAt) : undefined}
      isShownStale={shown ? !shown.isCurrent && !shown.appliedAt : false}
      onPropose={() => propose.mutate()}
      applyAction={
        shown && layout && term ? (
          <ApplyProposalAction
            // A new term closes the dialog: it reviewed this term's proposal.
            key={termId}
            organizationId={organizationId}
            eventId={eventId}
            termId={termId}
            term={`${term.label}, ${term.dates}`}
            proposalId={shown.id}
            layout={layout}
            canApply={shown.isCurrent}
            onPropose={() => propose.mutate()}
          />
        ) : null
      }
      proposeError={
        propose.isError ? (readApiError(propose.error).message ?? PROPOSE_FAILED) : undefined
      }
    />
  )
}
