import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { termEvaluationSchema } from "@/features/accommodation/api/evaluationSchemas"

/**
 * "Přepočítat" (S3-01): queues the evaluation of a term in either mode. The
 * answer is the term in `running`; its query then polls until the run is
 * stored, and the section reloads the history.
 */
export function useRecalculate(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      termEvaluationSchema.parse(
        await api
          .post(`${accommodationPath(organizationId, eventId)}/terms/${termId}/evaluation`)
          .json(),
      ),
    onSuccess: (evaluation) => {
      queryClient.setQueryData(evaluationKeys.term(organizationId, eventId, termId), evaluation)
    },
  })
}
