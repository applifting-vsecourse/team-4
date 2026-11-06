import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { registrationDetailSchema } from "@/features/registrations/api/eventRegistrationSchemas"
import { type RegistrationNeeds } from "@/features/registrations/api/registrationSchemas"

export type CorrectNeedsInput = {
  /** The registration version the organizer started editing on. */
  expectedVersion: number
  needs: RegistrationNeeds
}

/**
 * The organizer's correction of transport, diet and health (F63). The answer
 * is the registration read back from the database; it replaces the cached
 * detail, and the event's other queries reload.
 */
export function useCorrectNeeds(organizationId: string, eventId: string, registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CorrectNeedsInput) =>
      registrationDetailSchema.parse(
        await api
          .put(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/needs`,
            { json: input },
          )
          .json(),
      ),
    onSuccess: async (registration) => {
      queryClient.setQueryData(
        eventRegistrationKeys.detail(organizationId, eventId, registrationId),
        registration,
      )
      await queryClient.invalidateQueries({
        queryKey: eventRegistrationKeys.event(organizationId, eventId),
      })
    },
  })
}
