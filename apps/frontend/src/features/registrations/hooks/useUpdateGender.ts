import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { registrationDetailSchema } from "@/features/registrations/api/eventRegistrationSchemas"
import { type GenderAnswer } from "@/features/registrations/api/registrationSchemas"
import { toGenderAnswer } from "@/features/registrations/lib/gender"

/**
 * The organizer's correction of the gender answer (F64). The answer is the
 * registration read back from the database; it replaces the cached detail,
 * and the event's other queries (change requests) reload.
 */
export function useUpdateGender(organizationId: string, eventId: string, registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (answer: GenderAnswer) =>
      registrationDetailSchema.parse(
        await api
          .put(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/gender`,
            { json: toGenderAnswer(answer) },
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
