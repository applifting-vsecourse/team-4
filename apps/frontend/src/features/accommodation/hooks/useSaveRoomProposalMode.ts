import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { accommodationPath } from "@/features/accommodation/api/evaluationQueryOptions"
import { type EvaluationMode } from "@/features/accommodation/api/evaluationSchemas"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import { roomProposalModeResponseSchema } from "@/features/accommodation/api/roomProposalSchemas"

/** Nastavení → Automatizace (#385): saving the mode proposes nothing by itself. */
export function useSaveRoomProposalMode(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (mode: EvaluationMode) =>
      roomProposalModeResponseSchema.parse(
        await api
          .put(`${accommodationPath(organizationId, eventId)}/room-proposal-mode`, {
            json: { mode },
          })
          .json(),
      ).mode,
    onSuccess: async (mode) => {
      const key = roomProposalKeys.mode(organizationId, eventId)
      queryClient.setQueryData(key, mode)
      // Scheduled proposals may have been dropped; the evaluation mode is separate.
      await queryClient.invalidateQueries({
        queryKey: roomProposalKeys.terms(organizationId, eventId),
      })
    },
  })
}
