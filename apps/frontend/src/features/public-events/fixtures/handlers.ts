import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import { PUBLIC_EVENT } from "@/features/public-events/fixtures/publicEvent"

// MSW handlers for the public event page. Install with `msw.use(...)` in a
// story's `beforeEach`.

const DETAIL = `${env.VITE_API_URL}/public/events/:publicId`

export const publicEventHandlers = {
  detail: () => [http.get(DETAIL, () => HttpResponse.json(PUBLIC_EVENT))],
}
