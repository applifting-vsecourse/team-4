import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { accommodationPath } from "@/features/accommodation/api/evaluationQueryOptions"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import { termRoomProposalSchema } from "@/features/accommodation/api/roomProposalSchemas"

/**
 * "Navrhnout pokoje" (#365): queues the room proposal of a term in either
 * mode. The answer is the term in `running`; its query then polls until the
 * proposal is stored. No saved placement changes.
 */
export function useProposeRooms(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      termRoomProposalSchema.parse(
        await api
          .post(`${accommodationPath(organizationId, eventId)}/terms/${termId}/room-proposal`)
          .json(),
      ),
    onSuccess: (proposal) => {
      queryClient.setQueryData(roomProposalKeys.term(organizationId, eventId, termId), proposal)
    },
  })
}
