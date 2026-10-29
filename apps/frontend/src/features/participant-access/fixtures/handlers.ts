import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { PARTICIPANT } from "@/features/participant-access/fixtures/participant"

// MSW handlers for the participant's magic-link session. Install with
// `msw.use(...)` in a story's `beforeEach`.

const ME = `${env.VITE_API_URL}/participant/me`

export const participantHandlers = {
  signedIn: () => [http.get(ME, () => HttpResponse.json(PARTICIPANT))],
  signedOut: () => [
    http.get(ME, () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })),
  ],
}
