import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participantKeys } from "@/features/participant-access/api/participantQueryOptions"
import {
  participantProfileSchema,
  type ParticipantProfileInput,
} from "@/features/participant-access/api/participantSchemas"

export function useSaveParticipantProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ParticipantProfileInput) =>
      participantProfileSchema.parse(await api.put("participant/profile", { json: input }).json()),
    onSuccess: (profile) => {
      queryClient.setQueryData(participantKeys.profile(), profile)
    },
  })
}
