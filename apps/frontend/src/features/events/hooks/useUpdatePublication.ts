import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, eventPath } from "@/features/events/api/eventQueryOptions"
import { eventDetailSchema } from "@/features/events/api/eventSchemas"

// The answer is the event read back from the database, so the page shows
// "published" only once it is saved (F54-1).
export function useUpdatePublication(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (isPublished: boolean) =>
      eventDetailSchema.parse(
        await api
          .put(`${eventPath(organizationId, eventId)}/publication`, { json: { isPublished } })
          .json(),
      ),
    onSuccess: (event) =>
      queryClient.setQueryData(eventKeys.detail(organizationId, eventId), event),
  })
}
