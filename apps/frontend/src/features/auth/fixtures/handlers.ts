import { delay, http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { ORGANIZER_SESSION } from "@/features/auth/fixtures/session"

// MSW handlers for BetterAuth's session lookup and its sign-in and sign-up
// answers. Install with `msw.use(...)` in a story's `beforeEach`.

const AUTH = `${env.VITE_BETTER_AUTH_URL}/api/auth`
const SESSION = `${AUTH}/get-session`

/** BetterAuth refuses with a status and `{ code, message }`. */
const refused = (status: number, code: string) =>
  HttpResponse.json({ code, message: code }, { status })

export const authHandlers = {
  signedIn: () => [http.get(SESSION, () => HttpResponse.json(ORGANIZER_SESSION))],
  signedOut: () => [http.get(SESSION, () => HttpResponse.json(null))],
  signInRefused: (code = "INVALID_EMAIL_OR_PASSWORD") => [
    http.post(`${AUTH}/sign-in/email`, () =>
      refused(code === "INVALID_EMAIL_OR_PASSWORD" ? 401 : 500, code),
    ),
  ],
  signUpRefused: (code = "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") => [
    http.post(`${AUTH}/sign-up/email`, () =>
      refused(code.startsWith("USER_ALREADY_EXISTS") ? 422 : 500, code),
    ),
  ],
  /** The sign-in or sign-up request never answers: the form stays busy. */
  pending: () => [
    http.post(`${AUTH}/:action/email`, async () => {
      await delay("infinite")
      return HttpResponse.json(null)
    }),
  ],
}
