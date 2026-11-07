import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { participationDecidedSchema } from "@/features/accommodation/api/evaluationSchemas"

export type ParticipationDecision = {
  decision: "confirm" | "waitlist"
  /** One per attempt; repeating it saves nothing again. */
  submissionKey: string
  /** For a person without an effective value, saved with the decision or not at all. */
  determination?: { value: string; reason: string; answer: string | null }
}

/**
 * Confirms or waitlists one person in one term (S3-02). Evaluation data
 * reload after a success and after a refusal, so a rejected decision shows
 * the term as it is now. `invalidate` is also reloaded on success, e.g. the
 * registration detail with its term states.
 */
export function useDecideParticipation(
  organizationId: string,
  eventId: string,
  termId: string,
  registrationId: string,
  invalidate: readonly unknown[] = [],
) {
  const queryClient = useQueryClient()
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: evaluationKeys.event(organizationId, eventId) }),
      ...(invalidate.length ? [queryClient.invalidateQueries({ queryKey: invalidate })] : []),
    ])
  return useMutation({
    mutationFn: async (input: ParticipationDecision) =>
      participationDecidedSchema.parse(
        await api
          .post(
            `${accommodationPath(organizationId, eventId)}/terms/${termId}/registrations/${registrationId}/decision`,
            { json: input },
          )
          .json(),
      ),
    onSuccess: reload,
    onError: reload,
  })
}
