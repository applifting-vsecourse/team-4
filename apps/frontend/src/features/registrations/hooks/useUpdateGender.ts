import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { registrationDetailSchema } from "@/features/registrations/api/eventRegistrationSchemas"
import { type Gender } from "@/features/registrations/api/registrationSchemas"

/**
 * The organizer's correction of the gender answer (F64). The answer is the
 * registration read back from the database; it replaces the cached detail,
 * and the event's other queries (change requests) reload.
 */
export function useUpdateGender(organizationId: string, eventId: string, registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (gender: Gender | null) =>
      registrationDetailSchema.parse(
        await api
          .put(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/gender`,
            { json: { gender } },
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
