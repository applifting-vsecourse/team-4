import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { EVENT_SUMMARIES, EVENTS } from "@/features/events/fixtures/events"

// MSW handlers for the events of an organization. Install with `msw.use(...)`
// in a story's `beforeEach`.

const LIST = `${env.VITE_API_URL}/organizations/:organizationId/events`

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
}
