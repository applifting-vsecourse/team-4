import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { accommodationPath } from "@/features/accommodation/api/evaluationQueryOptions"
import { roomPublicationSchema } from "@/features/accommodation/api/publicationSchemas"

export const publicationKeys = {
  all: () => ["room-publication"] as const,
  term: (organizationId: string, eventId: string, termId: string) =>
    [...publicationKeys.all(), organizationId, eventId, termId] as const,
}

export const publicationPath = (organizationId: string, eventId: string, termId: string) =>
  `${accommodationPath(organizationId, eventId)}/terms/${termId}/publication`

export const publicationQueryOptions = (organizationId: string, eventId: string, termId: string) =>
  queryOptions({
    queryKey: publicationKeys.term(organizationId, eventId, termId),
    queryFn: async () =>
      roomPublicationSchema.parse(
        await api.get(publicationPath(organizationId, eventId, termId)).json(),
      ),
    // Another term keeps the previous state on screen until it arrives.
    placeholderData: keepPreviousData,
  })
