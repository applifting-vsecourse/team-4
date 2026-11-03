import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { programmeSchema } from "@/features/programme/api/programmeSchemas"

export const programmeKeys = {
  all: () => ["programme"] as const,
  organizer: (organizationId: string, eventId: string, termId: string) =>
    [...programmeKeys.all(), "organizer", organizationId, eventId, termId] as const,
  participant: (registrationId: string, termId: string) =>
    [...programmeKeys.all(), "participant", registrationId, termId] as const,
}

export const organizerProgrammePath = (organizationId: string, eventId: string, termId: string) =>
  `organizations/${organizationId}/events/${eventId}/terms/${termId}/programme`

// No automatic retries: a failed load is shown with "Zkusit znovu", never as
// an empty programme.
export const organizerProgrammeQueryOptions = (
  organizationId: string,
  eventId: string,
  termId: string,
) =>
  queryOptions({
    queryKey: programmeKeys.organizer(organizationId, eventId, termId),
    queryFn: async () =>
      programmeSchema.parse(
        await api.get(organizerProgrammePath(organizationId, eventId, termId)).json(),
      ),
    retry: false,
  })

export const participantProgrammeQueryOptions = (registrationId: string, termId: string) =>
  queryOptions({
    queryKey: programmeKeys.participant(registrationId, termId),
    queryFn: async () =>
      programmeSchema.parse(
        await api
          .get(`participant/registrations/${registrationId}/terms/${termId}/programme`)
          .json(),
      ),
    retry: false,
    // Access follows the stored participation, so a read is never reused for long.
    staleTime: 0,
  })
