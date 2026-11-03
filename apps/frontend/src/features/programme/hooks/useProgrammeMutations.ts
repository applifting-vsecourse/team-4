import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  organizerProgrammePath,
  programmeKeys,
} from "@/features/programme/api/programmeQueryOptions"
import { programmeSchema, type ProgrammeItemInput } from "@/features/programme/api/programmeSchemas"

type TermScope = { organizationId: string; eventId: string; termId: string }

// Every write answers with the programme read back from the database; it
// replaces the cache, so the UI never shows an unsaved change.
function useStoreProgramme({ organizationId, eventId, termId }: TermScope) {
  const queryClient = useQueryClient()
  return (programme: unknown) =>
    queryClient.setQueryData(
      programmeKeys.organizer(organizationId, eventId, termId),
      programmeSchema.parse(programme),
    )
}

/** Adds an item, or edits one when `itemId` is given. */
export function useSaveProgrammeItem(scope: TermScope) {
  const store = useStoreProgramme(scope)
  const path = organizerProgrammePath(scope.organizationId, scope.eventId, scope.termId)
  return useMutation({
    mutationFn: async ({ itemId, input }: { itemId?: string; input: ProgrammeItemInput }) =>
      programmeSchema.parse(
        await (
          itemId ? api.put(`${path}/${itemId}`, { json: input }) : api.post(path, { json: input })
        ).json(),
      ),
    onSuccess: store,
  })
}

export function useDeleteProgrammeItem(scope: TermScope) {
  const store = useStoreProgramme(scope)
  const path = organizerProgrammePath(scope.organizationId, scope.eventId, scope.termId)
  return useMutation({
    mutationFn: async (itemId: string) =>
      programmeSchema.parse(await api.delete(`${path}/${itemId}`).json()),
    onSuccess: store,
  })
}

/** After a refused write show the truth the server holds. */
export function useRefreshProgramme({ organizationId, eventId, termId }: TermScope) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: programmeKeys.organizer(organizationId, eventId, termId),
    })
}
