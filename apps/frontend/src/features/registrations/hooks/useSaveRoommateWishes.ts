import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  roommateWishesKey,
  roommateWishesPath,
} from "@/features/registrations/api/roommateWishQueryOptions"
import {
  roommateWishesSchema,
  type RoommateWishesInput,
} from "@/features/registrations/api/roommateWishSchemas"

/**
 * Stores the participant's roommate wishes at once, without the organizer's
 * approval (S4-05). The answer is the stored list with the current candidates;
 * it replaces the cached one.
 */
export function useSaveRoommateWishes(registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RoommateWishesInput) =>
      roommateWishesSchema.parse(
        await api.put(roommateWishesPath(registrationId), { json: input }).json(),
      ),
    onSuccess: (wishes) => {
      queryClient.setQueryData(roommateWishesKey(registrationId), wishes)
    },
  })
}
