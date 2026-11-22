import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participantRoomPlacementsSchema } from "@/features/accommodation/api/participantPlacementSchemas"

export const participantPlacementsPath = (registrationId: string) =>
  `participant/registrations/${registrationId}/room-placements`

// The confirmed terms are part of the key: a change of the registration that
// confirms or cancels a term reads the rooms again.
export const participantPlacementsQueryOptions = (
  registrationId: string,
  confirmedTermIds: readonly string[],
) =>
  queryOptions({
    queryKey: ["participant-room-placements", registrationId, ...confirmedTermIds],
    queryFn: async () =>
      participantRoomPlacementsSchema.parse(
        await api.get(participantPlacementsPath(registrationId)).json(),
      ),
    // As for the rest of the participant's registration: "Zkusit znovu" is theirs.
    retry: false,
  })
