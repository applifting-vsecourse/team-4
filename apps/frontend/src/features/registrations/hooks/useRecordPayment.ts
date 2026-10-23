import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { registrationDetailSchema } from "@/features/registrations/api/eventRegistrationSchemas"

export type PaymentInput = {
  /** One per attempt at the same content; a retry sends the same key. */
  submissionKey: string
  amountMinor: number
  /** `yyyy-MM-dd`. */
  receivedOn: string
}

/**
 * Records a received payment. The answer is the registration read back from
 * the database; it replaces the cached detail, and everything of the event is
 * invalidated so the list reloads with the filters it already has.
 */
export function useRecordPayment(organizationId: string, eventId: string, registrationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentInput) =>
      registrationDetailSchema.parse(
        await api
          .post(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/payments`,
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
