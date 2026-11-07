import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { confirmedProposalSchema } from "@/features/accommodation/api/evaluationSchemas"

/**
 * Potvrdit všechny vhodné (S3-02): confirms the suitable people of the proposal
 * the organizer saw, or nobody. The key is one per confirmation attempt, so a
 * double click or a retry after a lost response saves nothing twice; the
 * caller renews it for a new attempt. The event's evaluation reloads either
 * way: the states changed, or the proposal turned out to be old.
 */
export function useConfirmProposal(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  const reload = () =>
    queryClient.invalidateQueries({ queryKey: evaluationKeys.event(organizationId, eventId) })
  return useMutation({
    mutationFn: async (input: { runId: string; submissionKey: string }) =>
      confirmedProposalSchema.parse(
        await api
          .post(`${accommodationPath(organizationId, eventId)}/terms/${termId}/confirmations`, {
            json: input,
          })
          .json(),
      ),
    onSuccess: reload,
    // A refusal means the shown proposal is old; a failure that wrote nothing keeps it.
    onError: reload,
  })
}
