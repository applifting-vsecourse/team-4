import { queryOptions } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api, HTTPError } from "@/lib/api-client"

import {
  catalogEventSchema,
  publicEventSchema,
} from "@/features/public-events/api/publicEventSchemas"

export const publicEventKeys = {
  detail: (publicId: string) => ["public-event", publicId] as const,
  catalogDetail: (publicId: string) => ["public-event", publicId, "catalog"] as const,
}

const catalogEventPath = (publicId: string) =>
  `public/catalog/events/${encodeURIComponent(publicId)}`

/** Served by the API without sign-in, for published events only. */
export const catalogPhotoUrl = (publicId: string, photoId: string) =>
  `${env.VITE_API_URL}/${catalogEventPath(publicId)}/photos/${photoId}`

/**
 * The catalog detail (F55). `null` is the unavailable state: an unpublished,
 * a missing and a malformed link look the same. Other failures stay errors.
 */
export const catalogEventQueryOptions = (publicId: string) =>
  queryOptions({
    queryKey: publicEventKeys.catalogDetail(publicId),
    queryFn: async () => {
      try {
        return catalogEventSchema.parse(await api.get(catalogEventPath(publicId)).json())
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 404) return null
        throw error
      }
    },
  })

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
