import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participantKeys } from "@/features/participant-access/api/participantQueryOptions"

export function useParticipantLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post("participant/logout")
    },
    onSuccess: () => {
      queryClient.setQueryData(participantKeys.session(), null)
    },
  })
}
