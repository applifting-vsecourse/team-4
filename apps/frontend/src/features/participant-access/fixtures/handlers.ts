import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { ParticipantNotification } from "@/features/participant-access/api/participantNotificationSchemas"
import {
  participantProfileSchema,
  type ParticipantProfile,
} from "@/features/participant-access/api/participantSchemas"
import { NOTIFICATIONS } from "@/features/participant-access/fixtures/notifications"
import { PARTICIPANT, PROFILE } from "@/features/participant-access/fixtures/participant"

// MSW handlers for the participant's magic-link session. Install with
// `msw.use(...)` in a story's `beforeEach`.

const API = `${env.VITE_API_URL}/participant`
const ME = `${API}/me`
const PROFILE_URL = `${API}/profile`
const NOTIFICATIONS_URL = `${API}/notifications`

const unauthorized = () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })

export const MAGIC_LINK_SENT =
  "Pokud k e-mailu existuje přihláška, poslali jsme na něj přihlašovací odkaz."

export const participantHandlers = {
  /** The header's account menu reads the notifications (S4-06); none by default. */
  signedIn: () => [
    http.get(ME, () => HttpResponse.json(PARTICIPANT)),
    http.get(NOTIFICATIONS_URL, () => HttpResponse.json({ items: [] })),
  ],
  signedOut: () => [
    http.get(ME, unauthorized),
    http.get(PROFILE_URL, unauthorized),
    http.get(NOTIFICATIONS_URL, unauthorized),
  ],
  logout: () => [http.post(`${API}/logout`, () => new HttpResponse(null, { status: 204 }))],
  /** Asking for a link always answers alike, whether the e-mail is known or not. */
  magicLinkSent: () => [
    http.post(`${API}/magic-links`, () => HttpResponse.json({ message: MAGIC_LINK_SENT })),
  ],
  /** The link from the e-mail opens the session. */
  sessionOpened: () => [
    http.post(`${API}/session`, () => new HttpResponse(null, { status: 204 })),
    ...participantHandlers.signedIn(),
  ],
  /** The stored profile (S4-08); a save answers with what was sent, as the server stores it. */
  profile: (profile: ParticipantProfile = PROFILE) => [
    http.get(PROFILE_URL, () => HttpResponse.json(profile)),
    http.put(PROFILE_URL, async ({ request }) => {
      const sent = (await request.json()) as Partial<ParticipantProfile>
      return HttpResponse.json(
        participantProfileSchema.parse({
          email: profile.email,
          firstName: sent.firstName ?? null,
          lastName: sent.lastName ?? null,
          phone: sent.phone ?? null,
        }),
      )
    }),
  ],
  /**
   * Oznámení (S4-06). Each install keeps its own list, so opening, reading all
   * and dismissing show in the next load as the server would store them.
   */
  notifications: (initial: ParticipantNotification[] = NOTIFICATIONS) => {
    let items = initial.map((item) => ({ ...item }))
    const known = (id: unknown) => items.some((item) => item.id === id)
    const notFound = () => HttpResponse.json({ code: "notification_not_found" }, { status: 404 })
    const noContent = () => new HttpResponse(null, { status: 204 })

    return [
      http.get(NOTIFICATIONS_URL, () => HttpResponse.json({ items })),
      http.post(`${NOTIFICATIONS_URL}/read`, async ({ request }) => {
        const { ids } = (await request.json()) as { ids: string[] }
        items = items.map((item) => (ids.includes(item.id) ? { ...item, isRead: true } : item))
        return noContent()
      }),
      http.post(`${NOTIFICATIONS_URL}/:id/read`, ({ params }) => {
        if (!known(params.id)) return notFound()
        items = items.map((item) => (item.id === params.id ? { ...item, isRead: true } : item))
        return noContent()
      }),
      http.post(`${NOTIFICATIONS_URL}/:id/dismiss`, ({ params }) => {
        if (!known(params.id)) return notFound()
        items = items.filter((item) => item.id !== params.id)
        return noContent()
      }),
    ]
  },
}
