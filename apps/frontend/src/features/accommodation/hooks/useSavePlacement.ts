import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { placementKeys, placementsPath } from "@/features/accommodation/api/placementQueryOptions"
import {
  termPlacementsSchema,
  type PlacementInput,
} from "@/features/accommodation/api/placementSchemas"

/**
 * Saves the room and the lock of one participant in the term. The answer is
 * the term's placements read back from the database; it replaces the cache,
 * so the board never shows an unsaved placement. A failed save reloads them.
 */
export function useSavePlacement(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  const queryKey = placementKeys.term(organizationId, eventId, termId)
  return useMutation({
    mutationFn: async ({
      registrationId,
      input,
    }: {
      registrationId: string
      input: PlacementInput
    }) =>
      termPlacementsSchema.parse(
        await api
          .put(`${placementsPath(organizationId, eventId, termId)}/${registrationId}`, {
            json: input,
          })
          .json(),
      ),
    onSuccess: (placements) => queryClient.setQueryData(queryKey, placements),
    onError: () => queryClient.invalidateQueries({ queryKey }),
  })
}
