import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { accommodationPath } from "@/features/accommodation/api/evaluationQueryOptions"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import {
  roomProposalPreferencesSchema,
  type SoftPreferenceItem,
} from "@/features/accommodation/api/roomProposalSchemas"

/**
 * Nastavení → Návrh pokojů (#389): a new list makes every room proposal of
 * the event stale; the evaluation of participation stays as it is.
 */
export function useSaveRoomProposalPreferences(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  const key = roomProposalKeys.preferences(organizationId, eventId)
  return useMutation({
    mutationFn: async (preferences: SoftPreferenceItem[]) =>
      roomProposalPreferencesSchema.parse(
        await api
          .put(`${accommodationPath(organizationId, eventId)}/room-proposal-preferences`, {
            json: { preferences },
          })
          .json(),
      ),
    // A lost response may still have saved: the shown list is read again.
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(key, saved)
      await queryClient.invalidateQueries({
        queryKey: roomProposalKeys.terms(organizationId, eventId),
      })
    },
  })
}
