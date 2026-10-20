import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventDetailSchema, eventSummariesSchema } from "@/features/events/api/eventSchemas"

export const eventKeys = {
  all: () => ["events"] as const,
  list: (organizationId: string) => [...eventKeys.all(), "list", organizationId] as const,
  detail: (organizationId: string, eventId: string) =>
    [...eventKeys.all(), "detail", organizationId, eventId] as const,
}

export const eventsPath = (organizationId: string) => `organizations/${organizationId}/events`

export const eventPath = (organizationId: string, eventId: string) =>
  `${eventsPath(organizationId)}/${eventId}`

export const eventsQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: eventKeys.list(organizationId),
    queryFn: async () =>
      eventSummariesSchema.parse(await api.get(eventsPath(organizationId)).json()),
  })

export const eventQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: eventKeys.detail(organizationId, eventId),
    queryFn: async () =>
      eventDetailSchema.parse(await api.get(eventPath(organizationId, eventId)).json()),
  })
