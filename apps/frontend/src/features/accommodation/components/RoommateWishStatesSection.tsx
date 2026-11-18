import { useQuery } from "@tanstack/react-query"

import {
  termRoomProposalQueryOptions,
  termWishesQueryOptions,
} from "@/features/accommodation/api/roomProposalQueryOptions"
import { RoommateWishStates } from "@/features/accommodation/components/RoommateWishStates"
import { toWishRows } from "@/features/accommodation/lib/roomProposalView"

export type RoommateWishStatesSectionProps = {
  organizationId: string
  eventId: string
  termId: string
  /** The hard attribute, e.g. "Pohlaví"; for "Nelze splnit". */
  attribute?: string | null
}

// Ubytování → Přání na spolubydlící (#317) of the selected term: the saved
// state is read live, so it follows a placement change or an applied
// proposal; the proposal's state comes from the term's room proposal, the
// same query the proposal section reads, so both always agree.
export function RoommateWishStatesSection({
  organizationId,
  eventId,
  termId,
  attribute,
}: RoommateWishStatesSectionProps) {
  const wishes = useQuery(termWishesQueryOptions(organizationId, eventId, termId))
  const proposal = useQuery(termRoomProposalQueryOptions(organizationId, eventId, termId))
  const shown = proposal.data?.lastSolved

  return (
    <RoommateWishStates
      rows={wishes.data ? toWishRows(wishes.data.wishes, shown?.layout?.wishes) : []}
      attribute={attribute}
      proposal={shown?.layout ? (shown.isCurrent ? "current" : "stale") : "none"}
      // Until the proposal is read too, "Bez návrhu" could be wrong. A failed
      // proposal read shows the saved state alone.
      isLoading={wishes.isPending || proposal.isPending}
      isLoadFailed={wishes.isError}
      onRetryLoad={() => void wishes.refetch()}
    />
  )
}
