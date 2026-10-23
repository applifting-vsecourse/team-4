import { queryOptions } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { participantSchema } from "@/features/participant-access/api/participantSchemas"

export const participantKeys = {
  session: () => ["participant-session"] as const,
}

/**
 * `null` means no valid participant session (never signed in, expired or
 * logged out). Other failures stay errors, so they are not shown as signed out.
 */
export const participantSessionQueryOptions = () =>
  queryOptions({
    queryKey: participantKeys.session(),
    queryFn: async () => {
      try {
        return participantSchema.parse(await api.get("participant/me").json())
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) return null
        throw error
      }
    },
    retry: false,
  })
