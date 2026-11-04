import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { EVENT_SUMMARIES, EVENTS } from "@/features/events/fixtures/events"

// MSW handlers for the events of an organization. Install with `msw.use(...)`
// in a story's `beforeEach`.

const LIST = `${env.VITE_API_URL}/organizations/:organizationId/events`

// Stand-in for an uploaded photo of the public presentation (F55).
const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#bae6fd"/><path d="M0 360V250q160-110 320-30t320-50v190z" fill="#4d7c0f"/></svg>`

export const eventHandlers = {
  list: () => [
    http.get(LIST, () => HttpResponse.json(EVENT_SUMMARIES)),
    http.get(`${LIST}/:eventId`, ({ params }) => {
      const event = EVENTS.find(({ id }) => id === params.eventId)
      return event
        ? HttpResponse.json(event)
        : HttpResponse.json({ message: "Not Found" }, { status: 404 })
    }),
    http.get(
      `${LIST}/:eventId/photos/:photoId`,
      () => new HttpResponse(PHOTO, { headers: { "Content-Type": "image/svg+xml" } }),
    ),
  ],
}
