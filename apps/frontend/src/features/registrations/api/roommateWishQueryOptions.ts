import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participantRegistrationKeys } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { roommateWishesSchema } from "@/features/registrations/api/roommateWishSchemas"

export const roommateWishesPath = (registrationId: string) =>
  `participant/registrations/${registrationId}/roommate-wishes`

export const roommateWishesKey = (registrationId: string) =>
  [...participantRegistrationKeys.all(), "roommate-wishes", registrationId] as const

// No automatic retries, as for the rest of the participant's registration.
export const roommateWishesQueryOptions = (registrationId: string) =>
  queryOptions({
    queryKey: roommateWishesKey(registrationId),
    queryFn: async () =>
      roommateWishesSchema.parse(await api.get(roommateWishesPath(registrationId)).json()),
    retry: false,
  })
