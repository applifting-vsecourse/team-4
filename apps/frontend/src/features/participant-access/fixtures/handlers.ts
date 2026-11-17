import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { PARTICIPANT } from "@/features/participant-access/fixtures/participant"

// MSW handlers for the participant's magic-link session. Install with
// `msw.use(...)` in a story's `beforeEach`.

const API = `${env.VITE_API_URL}/participant`
const ME = `${API}/me`

export const MAGIC_LINK_SENT =
  "Pokud k e-mailu existuje přihláška, poslali jsme na něj přihlašovací odkaz."

export const participantHandlers = {
  signedIn: () => [http.get(ME, () => HttpResponse.json(PARTICIPANT))],
  signedOut: () => [
    http.get(ME, () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),
  ],
  /** Asking for a link always answers alike, whether the e-mail is known or not. */
  magicLinkSent: () => [
    http.post(`${API}/magic-links`, () => HttpResponse.json({ message: MAGIC_LINK_SENT })),
  ],
  /** The link from the e-mail opens the session. */
  sessionOpened: () => [
    http.post(`${API}/session`, () => new HttpResponse(null, { status: 204 })),
    ...participantHandlers.signedIn(),
  ],
}
