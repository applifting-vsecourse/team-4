import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, eventPath } from "@/features/events/api/eventQueryOptions"
import { eventDetailSchema } from "@/features/events/api/eventSchemas"

// `null` removes the setting. The answer is the event read back from the
// database, so the cache never holds a threshold that was not saved.
export function useUpdateChangeApproval(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (days: number | null) =>
      eventDetailSchema.parse(
        await api
          .put(`${eventPath(organizationId, eventId)}/change-approval`, { json: { days } })
          .json(),
      ),
    onSuccess: (event) =>
      queryClient.setQueryData(eventKeys.detail(organizationId, eventId), event),
  })
}
