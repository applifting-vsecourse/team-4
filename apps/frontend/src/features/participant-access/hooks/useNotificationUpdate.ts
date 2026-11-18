import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { ParticipantNotificationList } from "@/features/participant-access/api/participantNotificationSchemas"
import { participantKeys } from "@/features/participant-access/api/participantQueryOptions"

type Update<TInput> = {
  /** The endpoint under `participant/notifications`. */
  path: (input: TInput) => string
  /** The JSON body, when the endpoint takes one. */
  body?: (input: TInput) => unknown
  /** How the list looks once the server saved it, shown at once. */
  apply: (list: ParticipantNotificationList, input: TInput) => ParticipantNotificationList
  onError?: () => void
}

/**
 * A change of the read or dismissed state: the list shows it at once and
 * returns to the previous state when the server refuses it.
 */
export function useNotificationUpdate<TInput>({ path, body, apply, onError }: Update<TInput>) {
  const queryClient = useQueryClient()
  const key = participantKeys.notifications()

  return useMutation({
    mutationFn: async (input: TInput) => {
      await api.post(
        `participant/notifications${path(input)}`,
        body ? { json: body(input) } : undefined,
      )
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ParticipantNotificationList | null>(key)
      if (previous) queryClient.setQueryData(key, apply(previous, input))
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous)
      onError?.()
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
