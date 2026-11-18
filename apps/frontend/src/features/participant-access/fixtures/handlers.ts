import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import {
  participantProfileSchema,
  type ParticipantProfile,
} from "@/features/participant-access/api/participantSchemas"
import { PARTICIPANT, PROFILE } from "@/features/participant-access/fixtures/participant"

// MSW handlers for the participant's magic-link session. Install with
// `msw.use(...)` in a story's `beforeEach`.

const API = `${env.VITE_API_URL}/participant`
const ME = `${API}/me`
const PROFILE_URL = `${API}/profile`

const unauthorized = () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })

export const MAGIC_LINK_SENT =
  "Pokud k e-mailu existuje přihláška, poslali jsme na něj přihlašovací odkaz."

export const participantHandlers = {
  signedIn: () => [http.get(ME, () => HttpResponse.json(PARTICIPANT))],
  signedOut: () => [http.get(ME, unauthorized), http.get(PROFILE_URL, unauthorized)],
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
}
