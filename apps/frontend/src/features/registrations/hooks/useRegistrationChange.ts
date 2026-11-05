import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { participantRegistrationKeys } from "@/features/registrations/api/participantRegistrationQueryOptions"
import {
  changePreviewSchema,
  registrationChangeSchema,
  submittedChangeSchema,
  type ChangeProposal,
  type SubmitChangeInput,
} from "@/features/registrations/api/registrationChangeSchemas"

const ownPath = (registrationId: string) => `participant/registrations/${registrationId}/changes`

/** What the change would do; nothing is saved. */
export function usePreviewChange(registrationId: string) {
  return useMutation({
    mutationFn: async (proposal: ChangeProposal) =>
      changePreviewSchema.parse(
        await api.post(`${ownPath(registrationId)}/preview`, { json: proposal }).json(),
      ),
  })
}

/**
 * Makes the change or files the request. A refusal (stale, approval or
 * waitlist consent) is thrown for the caller to explain; nothing is cached as
 * success then.
 */
export function useSubmitChange(registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitChangeInput) =>
      submittedChangeSchema.parse(await api.post(ownPath(registrationId), { json: input }).json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: participantRegistrationKeys.all() }),
  })
}

/** The organizer approves or rejects a request; both are safe to repeat. */
export function useDecideChange(organizationId: string, eventId: string, registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      changeId,
      decision,
    }: {
      changeId: string
      decision: "approve" | "reject"
    }) =>
      registrationChangeSchema.parse(
        await api
          .post(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/changes/${changeId}/${decision}`,
          )
          .json(),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: eventRegistrationKeys.event(organizationId, eventId),
      }),
  })
}
