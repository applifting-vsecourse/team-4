import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  registrationDetailSchema,
  registrationListSchema,
  type RegistrationFilter,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { registrationChangeListSchema } from "@/features/registrations/api/registrationChangeSchemas"

// Everything under `event(...)` belongs to one event. A payment recorded in
// the detail (S2-12) invalidates that key, which reloads the list and detail.
export const eventRegistrationKeys = {
  event: (organizationId: string, eventId: string) =>
    ["event-registrations", organizationId, eventId] as const,
  list: (organizationId: string, eventId: string, filter: RegistrationFilter) =>
    [...eventRegistrationKeys.event(organizationId, eventId), "list", filter] as const,
  detail: (organizationId: string, eventId: string, registrationId: string) =>
    [...eventRegistrationKeys.event(organizationId, eventId), "detail", registrationId] as const,
}

const registrationsPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}/registrations`

export const eventRegistrationsQueryOptions = (
  organizationId: string,
  eventId: string,
  filter: RegistrationFilter,
) =>
  queryOptions({
    queryKey: eventRegistrationKeys.list(organizationId, eventId, filter),
    queryFn: async () => {
      const searchParams = Object.fromEntries(
        Object.entries(filter).filter((entry): entry is [string, string] => Boolean(entry[1])),
      )
      return registrationListSchema.parse(
        await api.get(registrationsPath(organizationId, eventId), { searchParams }).json(),
      )
    },
  })

export const eventRegistrationQueryOptions = (
  organizationId: string,
  eventId: string,
  registrationId: string,
) =>
  queryOptions({
    queryKey: eventRegistrationKeys.detail(organizationId, eventId, registrationId),
    queryFn: async () =>
      registrationDetailSchema.parse(
        await api.get(`${registrationsPath(organizationId, eventId)}/${registrationId}`).json(),
      ),
  })

const eventPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}`

/** Requests waiting for approval, oldest first (F35-2a). */
export const pendingChangesQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: [...eventRegistrationKeys.event(organizationId, eventId), "pending-changes"] as const,
    queryFn: async () =>
      registrationChangeListSchema.parse(
        await api.get(`${eventPath(organizationId, eventId)}/change-requests`).json(),
      ).changes,
  })

/** Every change of one registration, newest first. */
export const registrationChangesQueryOptions = (
  organizationId: string,
  eventId: string,
  registrationId: string,
) =>
  queryOptions({
    queryKey: [
      ...eventRegistrationKeys.event(organizationId, eventId),
      "changes",
      registrationId,
    ] as const,
    queryFn: async () =>
      registrationChangeListSchema.parse(
        await api
          .get(`${registrationsPath(organizationId, eventId)}/${registrationId}/changes`)
          .json(),
      ).changes,
  })
