import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { ORGANIZER_SESSION } from "@/features/auth/fixtures/session"

// MSW handlers for BetterAuth's session lookup. Install with `msw.use(...)`
// in a story's `beforeEach`.

const SESSION = `${env.VITE_BETTER_AUTH_URL}/api/auth/get-session`

export const authHandlers = {
  signedIn: () => [http.get(SESSION, () => HttpResponse.json(ORGANIZER_SESSION))],
  signedOut: () => [http.get(SESSION, () => HttpResponse.json(null))],
}
