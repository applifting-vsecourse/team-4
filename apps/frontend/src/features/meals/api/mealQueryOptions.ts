import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { mealOverviewSchema } from "@/features/meals/api/mealSchemas"

export const mealKeys = {
  all: () => ["meals"] as const,
  term: (organizationId: string, eventId: string, termId: string) =>
    [...mealKeys.all(), organizationId, eventId, termId] as const,
}

export const mealsPath = (organizationId: string, eventId: string, termId: string) =>
  `organizations/${organizationId}/events/${eventId}/meals/${termId}`

export const mealOverviewQueryOptions = (organizationId: string, eventId: string, termId: string) =>
  queryOptions({
    queryKey: mealKeys.term(organizationId, eventId, termId),
    queryFn: async () =>
      mealOverviewSchema.parse(await api.get(mealsPath(organizationId, eventId, termId)).json()),
    // Switching the term keeps the page height until the other counts arrive.
    placeholderData: keepPreviousData,
  })
