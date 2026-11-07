import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { termEvaluationSchema } from "@/features/accommodation/api/evaluationSchemas"

export type MoveInput = {
  registrationId: string
  targetId: string
  placement: "before" | "after"
  reason: string
  /** The term's input version the organizer saw; a newer one refuses the move. */
  expectedVersion: number
}

/**
 * Změnit pořadí (S3-03, F39-1): places an unconfirmed person right before or
 * after another one of the queue. The answer is the term after the move, its
 * proposal stale; the history of the term and of the person reload. Sending
 * the same move again changes nothing more.
 */
export function useMoveInQueue(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MoveInput) =>
      termEvaluationSchema.parse(
        await api
          .post(`${accommodationPath(organizationId, eventId)}/terms/${termId}/order/moves`, {
            json: input,
          })
          .json(),
      ),
    onSuccess: async (evaluation, input) => {
      queryClient.setQueryData(evaluationKeys.term(organizationId, eventId, termId), evaluation)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: evaluationKeys.moves(organizationId, eventId, termId),
        }),
        queryClient.invalidateQueries({
          queryKey: evaluationKeys.registration(organizationId, eventId, input.registrationId),
        }),
      ])
    },
  })
}
