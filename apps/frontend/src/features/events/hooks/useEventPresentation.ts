import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, eventPath } from "@/features/events/api/eventQueryOptions"
import { eventDetailSchema, type PresentationInput } from "@/features/events/api/eventSchemas"

// Writes of the public presentation (F55). Each answers with the saved event,
// which replaces the cached detail.
function useStore(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return (event: unknown) =>
    queryClient.setQueryData(
      eventKeys.detail(organizationId, eventId),
      eventDetailSchema.parse(event),
    )
}

export function useUpdatePresentation(organizationId: string, eventId: string) {
  const store = useStore(organizationId, eventId)
  return useMutation({
    mutationFn: async (input: PresentationInput) =>
      api.put(`${eventPath(organizationId, eventId)}/presentation`, { json: input }).json(),
    onSuccess: store,
  })
}

export function useAddPhoto(organizationId: string, eventId: string) {
  const store = useStore(organizationId, eventId)
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append("file", file)
      return api.post(`${eventPath(organizationId, eventId)}/photos`, { body }).json()
    },
    onSuccess: store,
  })
}

export function useRemovePhoto(organizationId: string, eventId: string) {
  const store = useStore(organizationId, eventId)
  return useMutation({
    mutationFn: async (photoId: string) =>
      api.delete(`${eventPath(organizationId, eventId)}/photos/${photoId}`).json(),
    onSuccess: store,
  })
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("Photo could not be read"))
    reader.readAsDataURL(blob)
  })

/**
 * The event's photos for the organizer, also when the event is not published.
 * They are read with the session (an <img> could not send it to the API's
 * origin) and kept as data URLs, so nothing has to be released. `undefined`
 * while loading, `null` when the photo could not be loaded.
 */
export function useOrganizerPhotoUrls(organizationId: string, eventId: string, photoIds: string[]) {
  return useQueries({
    queries: photoIds.map((photoId) => ({
      queryKey: [...eventKeys.detail(organizationId, eventId), "photo", photoId],
      queryFn: async () =>
        readAsDataUrl(
          await api.get(`${eventPath(organizationId, eventId)}/photos/${photoId}`).blob(),
        ),
      staleTime: Infinity,
    })),
  }).map((result) => (result.isError ? null : result.data))
}
