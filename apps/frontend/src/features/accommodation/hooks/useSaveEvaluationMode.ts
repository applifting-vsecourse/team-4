import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import {
  evaluationModeResponseSchema,
  type EvaluationMode,
} from "@/features/accommodation/api/evaluationSchemas"

/** Nastavení → Automatizace (S3-01): saving the mode evaluates nothing by itself. */
export function useSaveEvaluationMode(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (mode: EvaluationMode) =>
      evaluationModeResponseSchema.parse(
        await api
          .put(`${accommodationPath(organizationId, eventId)}/evaluation-mode`, { json: { mode } })
          .json(),
      ).mode,
    onSuccess: async (mode) => {
      queryClient.setQueryData(evaluationKeys.mode(organizationId, eventId), mode)
      // A scheduled automatic evaluation may have been dropped.
      await queryClient.invalidateQueries({
        queryKey: evaluationKeys.event(organizationId, eventId),
      })
    },
  })
}
