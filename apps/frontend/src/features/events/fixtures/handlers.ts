import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { EVENT_SUMMARIES, EVENTS } from "@/features/events/fixtures/events"

// MSW handlers for the events of an organization. Install with `msw.use(...)`
// in a story's `beforeEach`.

const LIST = `${env.VITE_API_URL}/organizations/:organizationId/events`
const PUBLICATION = `${LIST}/:eventId/publication`

export const eventHandlers = {
  list: () => [
    http.get(LIST, () => HttpResponse.json(EVENT_SUMMARIES)),
    http.get(`${LIST}/:eventId`, ({ params }) => {
      const event = EVENTS.find(({ id }) => id === params.eventId)
      return event
        ? HttpResponse.json(event)
        : HttpResponse.json({ message: "Not Found" }, { status: 404 })
    }),
  ],
  /** One event in place of its fixture, e.g. in another publication state. */
  detail: (event: EventDetail) => [http.get(`${LIST}/${event.id}`, () => HttpResponse.json(event))],
  /** Saves the publication and answers with the event read back. */
  publication: (event: EventDetail) => [
    http.put(PUBLICATION, async ({ request }) => {
      const { isPublished } = (await request.json()) as { isPublished: boolean }
      return HttpResponse.json({ ...event, isPublished })
    }),
  ],
  /** The change of publication fails on the server. */
  publicationFails: () => [
    http.put(PUBLICATION, () =>
      HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    ),
  ],
}
