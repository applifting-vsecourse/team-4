import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { roomsOverviewSchema } from "@/features/rooms/api/roomSchemas"

export const roomKeys = {
  all: () => ["rooms"] as const,
  overview: (organizationId: string, eventId: string) =>
    [...roomKeys.all(), organizationId, eventId] as const,
}

export const roomsPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}/rooms`

export const roomsQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: roomKeys.overview(organizationId, eventId),
    queryFn: async () =>
      roomsOverviewSchema.parse(await api.get(roomsPath(organizationId, eventId)).json()),
  })
