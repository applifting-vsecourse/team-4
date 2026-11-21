import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { accommodationPath } from "@/features/accommodation/api/evaluationQueryOptions"
import { termPlacementsSchema } from "@/features/accommodation/api/placementSchemas"

export const placementKeys = {
  all: () => ["room-placements"] as const,
  term: (organizationId: string, eventId: string, termId: string) =>
    [...placementKeys.all(), organizationId, eventId, termId] as const,
}

export const placementsPath = (organizationId: string, eventId: string, termId: string) =>
  `${accommodationPath(organizationId, eventId)}/terms/${termId}/placements`

export const placementsQueryOptions = (organizationId: string, eventId: string, termId: string) =>
  queryOptions({
    queryKey: placementKeys.term(organizationId, eventId, termId),
    queryFn: async () =>
      termPlacementsSchema.parse(
        await api.get(placementsPath(organizationId, eventId, termId)).json(),
      ),
    // Another term keeps the previous one on screen until it arrives.
    placeholderData: keepPreviousData,
  })
