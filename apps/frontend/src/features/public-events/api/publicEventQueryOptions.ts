import { queryOptions } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { publicEventSchema } from "@/features/public-events/api/publicEventSchemas"

export const publicEventKeys = {
  detail: (publicId: string) => ["public-event", publicId] as const,
}

/**
 * `null` is the unavailable state: a draft, a missing and a malformed link look
 * the same. Other failures stay errors, so they are not mistaken for it.
 */
export const publicEventQueryOptions = (publicId: string) =>
  queryOptions({
    queryKey: publicEventKeys.detail(publicId),
    queryFn: async () => {
      try {
        return publicEventSchema.parse(
          await api.get(`public/events/${encodeURIComponent(publicId)}`).json(),
        )
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 404) return null
        throw error
      }
    },
  })
