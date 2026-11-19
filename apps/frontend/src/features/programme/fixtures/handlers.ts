import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { programmeSchema, type Programme } from "@/features/programme/api/programmeSchemas"
import { TERM_PROGRAMME } from "@/features/programme/fixtures/programme"

// MSW handlers for the programme of a term. Install with `msw.use(...)` in a
// story's `beforeEach`.

const PARTICIPANT = `${env.VITE_API_URL}/participant/registrations/:registrationId/terms/:termId/programme`
const ORGANIZER = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/terms/:termId/programme`

const NO_PROGRAMME: Programme = programmeSchema.parse({ items: [] })

export const programmeHandlers = {
  participant: () => [http.get(PARTICIPANT, () => HttpResponse.json(TERM_PROGRAMME))],
  /** The organizer has not added any item yet. */
  participantEmpty: () => [http.get(PARTICIPANT, () => HttpResponse.json(NO_PROGRAMME))],
  organizer: () => [http.get(ORGANIZER, () => HttpResponse.json(TERM_PROGRAMME))],
  organizerEmpty: () => [http.get(ORGANIZER, () => HttpResponse.json(NO_PROGRAMME))],
}
