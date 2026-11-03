import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { TERM_PROGRAMME } from "@/features/programme/fixtures/programme"

// MSW handlers for the programme of a term. Install with `msw.use(...)` in a
// story's `beforeEach`.

const PARTICIPANT = `${env.VITE_API_URL}/participant/registrations/:registrationId/terms/:termId/programme`
const ORGANIZER = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/terms/:termId/programme`

export const programmeHandlers = {
  participant: () => [http.get(PARTICIPANT, () => HttpResponse.json(TERM_PROGRAMME))],
  organizer: () => [http.get(ORGANIZER, () => HttpResponse.json(TERM_PROGRAMME))],
}
