import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventQuestionsSchema } from "@/features/registrations/api/questionSchemas"

export const questionKeys = {
  event: (organizationId: string, eventId: string) =>
    ["registration-questions", organizationId, eventId] as const,
}

export const questionsPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}/questions`

/** Nastavení → Otázky v přihlášce (#485). */
export const eventQuestionsQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: questionKeys.event(organizationId, eventId),
    queryFn: async () =>
      eventQuestionsSchema.parse(await api.get(questionsPath(organizationId, eventId)).json())
        .questions,
  })
