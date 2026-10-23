import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  participantRegistrationListSchema,
  participantRegistrationSchema,
} from "@/features/registrations/api/participantRegistrationSchemas"

export const participantRegistrationKeys = {
  all: () => ["participant-registrations"] as const,
  list: () => [...participantRegistrationKeys.all(), "list"] as const,
  detail: (registrationId: string) =>
    [...participantRegistrationKeys.all(), "detail", registrationId] as const,
}

// No automatic retries: a refused session or an unavailable registration is an
// answer to show, and "Zkusit znovu" is the participant's choice.
export const participantRegistrationsQueryOptions = () =>
  queryOptions({
    queryKey: participantRegistrationKeys.list(),
    queryFn: async () =>
      participantRegistrationListSchema.parse(await api.get("participant/registrations").json())
        .registrations,
    retry: false,
  })

export const participantRegistrationQueryOptions = (registrationId: string) =>
  queryOptions({
    queryKey: participantRegistrationKeys.detail(registrationId),
    queryFn: async () =>
      participantRegistrationSchema.parse(
        await api.get(`participant/registrations/${registrationId}`).json(),
      ),
    retry: false,
  })
