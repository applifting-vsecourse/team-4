import { queryOptions } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { participantNotificationListSchema } from "@/features/participant-access/api/participantNotificationSchemas"
import {
  participantProfileSchema,
  participantSchema,
} from "@/features/participant-access/api/participantSchemas"

export const participantKeys = {
  session: () => ["participant-session"] as const,
  profile: () => ["participant-profile"] as const,
  notifications: () => ["participant-notifications"] as const,
}

/** Reads a participant endpoint; `null` when there is no valid session. */
async function readSigned<T>(path: string, parse: (body: unknown) => T): Promise<T | null> {
  try {
    return parse(await api.get(path).json())
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 401) return null
    throw error
  }
}

/**
 * `null` means no valid participant session (never signed in, expired or
 * logged out). Other failures stay errors, so they are not shown as signed out.
 */
export const participantSessionQueryOptions = () =>
  queryOptions({
    queryKey: participantKeys.session(),
    queryFn: () => readSigned("participant/me", (body) => participantSchema.parse(body)),
    retry: false,
  })

/** The signed-in account's profile (S4-08); `null` without a valid session. */
export const participantProfileQueryOptions = () =>
  queryOptions({
    queryKey: participantKeys.profile(),
    queryFn: () =>
      readSigned("participant/profile", (body) => participantProfileSchema.parse(body)),
    retry: false,
  })

/**
 * The signed-in account's notifications (S4-06), shared by Oznámení and the
 * unread dot of the account menu; `null` without a valid session.
 */
export const participantNotificationsQueryOptions = () =>
  queryOptions({
    queryKey: participantKeys.notifications(),
    queryFn: () =>
      readSigned("participant/notifications", (body) =>
        participantNotificationListSchema.parse(body),
      ),
    retry: false,
  })
