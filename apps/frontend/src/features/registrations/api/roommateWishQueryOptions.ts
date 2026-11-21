import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import {
  organizerRoommateWishesSchema,
  roommateWishesSchema,
} from "@/features/registrations/api/roommateWishSchemas"

export const roommateWishesPath = (registrationId: string) =>
  `participant/registrations/${registrationId}/roommate-wishes`

// Its own root, not under the participant's registrations: a saved change of
// the registration reloads those and waits for them, and the wishes need
// none of it (they are saved apart from the change).
export const roommateWishesKey = (registrationId: string) =>
  ["participant-roommate-wishes", registrationId] as const

// No automatic retries, as for the rest of the participant's registration.
export const roommateWishesQueryOptions = (registrationId: string) =>
  queryOptions({
    queryKey: roommateWishesKey(registrationId),
    queryFn: async () =>
      roommateWishesSchema.parse(await api.get(roommateWishesPath(registrationId)).json()),
    retry: false,
  })

export const organizerRoommateWishesPath = (
  organizationId: string,
  eventId: string,
  registrationId: string,
) =>
  `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/roommate-wishes`

/** The wishes of a registration in the organizer's detail (S4-05). */
export const organizerRoommateWishesQueryOptions = (
  organizationId: string,
  eventId: string,
  registrationId: string,
) =>
  queryOptions({
    queryKey: [
      ...eventRegistrationKeys.detail(organizationId, eventId, registrationId),
      "roommate-wishes",
    ],
    queryFn: async () =>
      organizerRoommateWishesSchema.parse(
        await api.get(organizerRoommateWishesPath(organizationId, eventId, registrationId)).json(),
      ),
  })
