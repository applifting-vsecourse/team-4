import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { ROOMS_OVERVIEW } from "@/features/rooms/fixtures/rooms"

// MSW handlers for the rooms of an event. Install with `msw.use(...)` in a
// story's `beforeEach`.

const OVERVIEW = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/rooms`

export const roomHandlers = {
  overview: () => [http.get(OVERVIEW, () => HttpResponse.json(ROOMS_OVERVIEW))],
}
