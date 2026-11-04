import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import letniTaborImage from "@/features/public-events/fixtures/images/letni-tabor.jpg"
import { CATALOG_EVENT, PUBLIC_EVENT } from "@/features/public-events/fixtures/publicEvent"

// MSW handlers for the public event pages. Install with `msw.use(...)` in a
// story's `beforeEach`.

const DETAIL = `${env.VITE_API_URL}/public/events/:publicId`
const CATALOG_DETAIL = `${env.VITE_API_URL}/public/catalog/events/:publicId`

const NOT_AVAILABLE = { statusCode: 404, message: "Záznam není dostupný" }

export const publicEventHandlers = {
  detail: () => [http.get(DETAIL, () => HttpResponse.json(PUBLIC_EVENT))],
  /** The catalog detail (F55) and its photos. */
  catalogDetail: () => [
    http.get(CATALOG_DETAIL, () => HttpResponse.json(CATALOG_EVENT)),
    http.get(`${CATALOG_DETAIL}/photos/:photoId`, async () => {
      const image = await (await fetch(letniTaborImage)).arrayBuffer()
      return new HttpResponse(image, { headers: { "Content-Type": "image/jpeg" } })
    }),
  ],
  /** Unpublished, unknown and malformed links answer alike. */
  catalogUnavailable: () => [
    http.get(CATALOG_DETAIL, () => HttpResponse.json(NOT_AVAILABLE, { status: 404 })),
  ],
  catalogFailed: () => [
    http.get(CATALOG_DETAIL, () => HttpResponse.json({ statusCode: 500 }, { status: 500 })),
  ],
}
