import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, eventPath, eventsPath } from "@/features/events/api/eventQueryOptions"
import {
  eventDetailSchema,
  type EventDetail,
  type EventInput,
  type TermInput,
} from "@/features/events/api/eventSchemas"

// Every write answers with the saved event read back from the database; it
// replaces the cached detail, so the UI never shows an unsaved change.
function useStoreEvent(organizationId: string) {
  const queryClient = useQueryClient()
  return async (event: EventDetail) => {
    queryClient.setQueryData(eventKeys.detail(organizationId, event.id), event)
    await queryClient.invalidateQueries({ queryKey: eventKeys.list(organizationId) })
  }
}

export function useCreateEvent(organizationId: string) {
  const store = useStoreEvent(organizationId)
  return useMutation({
    mutationFn: async (input: EventInput) =>
      eventDetailSchema.parse(await api.post(eventsPath(organizationId), { json: input }).json()),
    onSuccess: store,
  })
}

export function useUpdateEvent(organizationId: string, eventId: string) {
  const store = useStoreEvent(organizationId)
  return useMutation({
    mutationFn: async (input: EventInput) =>
      eventDetailSchema.parse(
        await api.put(eventPath(organizationId, eventId), { json: input }).json(),
      ),
    onSuccess: store,
  })
}

/** Adds a term, or edits one when `termId` is given. */
export function useSaveTerm(organizationId: string, eventId: string) {
  const store = useStoreEvent(organizationId)
  return useMutation({
    mutationFn: async ({ termId, input }: { termId?: string; input: TermInput }) => {
      const terms = `${eventPath(organizationId, eventId)}/terms`
      const request = termId
        ? api.put(`${terms}/${termId}`, { json: input })
        : api.post(terms, { json: input })
      return eventDetailSchema.parse(await request.json())
    },
    onSuccess: store,
  })
}

export function useDeleteTerm(organizationId: string, eventId: string) {
  const store = useStoreEvent(organizationId)
  return useMutation({
    mutationFn: async (termId: string) =>
      eventDetailSchema.parse(
        await api.delete(`${eventPath(organizationId, eventId)}/terms/${termId}`).json(),
      ),
    onSuccess: store,
  })
}

/** After a refused write (e.g. the event got locked meanwhile) show the truth. */
export function useRefreshEvent(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(organizationId, eventId) })
}
