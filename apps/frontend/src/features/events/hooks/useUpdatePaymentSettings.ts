import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, eventPath } from "@/features/events/api/eventQueryOptions"
import { eventDetailSchema } from "@/features/events/api/eventSchemas"
import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"

// The answer is the event read back from the database, so the cache never
// holds settings that were not saved.
export function useUpdatePaymentSettings(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentSettings) =>
      eventDetailSchema.parse(
        await api
          .put(`${eventPath(organizationId, eventId)}/payment-settings`, { json: input })
          .json(),
      ),
    onSuccess: (event) =>
      queryClient.setQueryData(eventKeys.detail(organizationId, eventId), event),
  })
}
