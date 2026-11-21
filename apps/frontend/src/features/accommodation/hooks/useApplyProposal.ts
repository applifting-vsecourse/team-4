import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { placementKeys } from "@/features/accommodation/api/placementQueryOptions"
import { appliedProposalSchema } from "@/features/accommodation/api/roomProposalSchemas"

/**
 * Použít návrh (#390, phase-2 spec §7.2): saves the placements of every
 * unlocked person of the proposal the organizer reviewed, or nothing. The
 * key is one per attempt, so a double click or a retry after a lost
 * response saves nothing twice. The term's proposal reloads either way: the
 * placements changed, or the proposal turned out to be stale.
 */
export function useApplyProposal(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  // The term's proposal and wishes, and the saved placements it changed.
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: evaluationKeys.event(organizationId, eventId),
        predicate: (query) => query.queryKey[3] === "room-proposal",
      }),
      queryClient.invalidateQueries({
        queryKey: placementKeys.term(organizationId, eventId, termId),
      }),
    ])
  return useMutation({
    mutationFn: async (input: { proposalId: string; submissionKey: string }) =>
      appliedProposalSchema.parse(
        await api
          .post(
            `${accommodationPath(organizationId, eventId)}/terms/${termId}/room-proposal/apply`,
            { json: input },
          )
          .json(),
      ),
    onSuccess: reload,
    onError: reload,
  })
}
