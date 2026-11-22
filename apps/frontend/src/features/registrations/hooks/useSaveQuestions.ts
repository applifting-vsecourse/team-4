import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { questionKeys, questionsPath } from "@/features/registrations/api/questionQueryOptions"
import {
  eventQuestionsSchema,
  type QuestionDraft,
} from "@/features/registrations/api/questionSchemas"

/**
 * Saves the questions of the form, all of them or nothing (#485). What lists
 * them elsewhere (the attributes of the accommodation rules) is reloaded too.
 */
export function useSaveQuestions(
  organizationId: string,
  eventId: string,
  /** Also reloaded on success. */
  invalidate: readonly (readonly unknown[])[] = [],
) {
  const queryClient = useQueryClient()
  const key = questionKeys.event(organizationId, eventId)
  return useMutation({
    mutationFn: async (questions: QuestionDraft[]) =>
      eventQuestionsSchema.parse(
        await api.put(questionsPath(organizationId, eventId), { json: { questions } }).json(),
      ).questions,
    onSuccess: async (saved) => {
      queryClient.setQueryData(key, saved)
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
    // A lost response may still have saved: the list is read again.
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
