import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, eventPath } from "@/features/events/api/eventQueryOptions"
import { eventDetailSchema } from "@/features/events/api/eventSchemas"

// The answer is the event read back from the database, so the page shows
// "open" and the lock only once they are saved (S2-06).
export function useOpenRegistration(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      eventDetailSchema.parse(
        await api.post(`${eventPath(organizationId, eventId)}/open-registration`).json(),
      ),
    onSuccess: async (event) => {
      queryClient.setQueryData(eventKeys.detail(organizationId, eventId), event)
      await queryClient.invalidateQueries({ queryKey: eventKeys.list(organizationId) })
    },
  })
}
