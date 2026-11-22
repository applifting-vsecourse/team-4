import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  publicationKeys,
  publicationPath,
} from "@/features/accommodation/api/publicationQueryOptions"
import { roomPublicationSchema } from "@/features/accommodation/api/publicationSchemas"

type PublicationChange = { termId: string; isPublished: boolean }

/**
 * Publishes the room placements of a term or takes the publication back. The
 * term travels with the change, so switching the term meanwhile stores the
 * answer for the term it was made for.
 */
export function useSetPublication(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ termId, isPublished }: PublicationChange) => {
      const path = publicationPath(organizationId, eventId, termId)
      return roomPublicationSchema.parse(
        await (isPublished ? api.put(path) : api.delete(path)).json(),
      )
    },
    onSuccess: (publication, { termId }) => {
      queryClient.setQueryData(publicationKeys.term(organizationId, eventId, termId), publication)
    },
  })
}
