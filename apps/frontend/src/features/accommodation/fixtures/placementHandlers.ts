import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { PlacementInput, TermPlacements } from "@/features/accommodation/api/placementSchemas"
import { TERM_PLACEMENTS } from "@/features/accommodation/fixtures/placements"

// MSW handlers for the saved room placements of a term (F14-2), with the
// contract proposed for #337. Install with `msw.use(...)` in a story's `beforeEach`.

export const PLACEMENTS =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/placements"

/** The placements of a term, kept in memory: each save changes what the next read returns. */
export function placementHandlers(initial: TermPlacements = TERM_PLACEMENTS) {
  let placements = structuredClone(initial)
  return [
    http.get(`${env.VITE_API_URL}${PLACEMENTS}`, () => HttpResponse.json(placements)),
    http.put(`${env.VITE_API_URL}${PLACEMENTS}/:registrationId`, async ({ params, request }) => {
      const input = (await request.json()) as PlacementInput
      placements = {
        ...placements,
        people: placements.people.map((person) =>
          person.registrationId === params.registrationId ? { ...person, ...input } : person,
        ),
      }
      return HttpResponse.json(placements)
    }),
  ]
}
