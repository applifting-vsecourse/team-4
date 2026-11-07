import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { evaluationKeys } from "@/features/accommodation/api/evaluationQueryOptions"
import { registrationAccommodationSchema } from "@/features/accommodation/api/evaluationSchemas"

export type DeterminationInput = {
  value: string
  reason: string
  /** The participant's answer the organizer decided on, as the API stores it. */
  answer: string | null
}

/**
 * Určit ubytování (spec v4 §4): the effective value for every term of the
 * registration. The terms' proposals turn stale, so the event's evaluation
 * reloads, as does the organizer's registration detail (its F64 notice).
 */
export function useDetermine(
  organizationId: string,
  eventId: string,
  registrationId: string,
  /** Also reloaded on success, e.g. the registration detail of another feature. */
  invalidate: readonly unknown[] = [],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeterminationInput) =>
      registrationAccommodationSchema.parse(
        await api
          .put(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/accommodation/determination`,
            { json: input },
          )
          .json(),
      ),
    // A refusal (e.g. the answer changed meanwhile) means the shown data are old.
    onError: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: evaluationKeys.event(organizationId, eventId) }),
        ...(invalidate.length ? [queryClient.invalidateQueries({ queryKey: invalidate })] : []),
      ]),
    onSuccess: async (accommodation) => {
      queryClient.setQueryData(
        evaluationKeys.registration(organizationId, eventId, registrationId),
        accommodation,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: evaluationKeys.event(organizationId, eventId) }),
        ...(invalidate.length ? [queryClient.invalidateQueries({ queryKey: invalidate })] : []),
      ])
    },
  })
}
