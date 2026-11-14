import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { CatalogEvent, PublicEvent } from "@/features/public-events/api/publicEventSchemas"
import letniTaborImage from "@/features/public-events/fixtures/images/letni-tabor.jpg"
import {
  CATALOG_EVENT,
  CATALOG_LIST,
  PUBLIC_EVENT,
} from "@/features/public-events/fixtures/publicEvent"

// MSW handlers for the public event pages. Install with `msw.use(...)` in a
// story's `beforeEach`.

const DETAIL = `${env.VITE_API_URL}/public/events/:publicId`
const CATALOG_DETAIL = `${env.VITE_API_URL}/public/catalog/events/:publicId`

const CATALOG_LIST_URL = `${env.VITE_API_URL}/public/catalog/events`

const NOT_AVAILABLE = { statusCode: 404, message: "Záznam není dostupný" }

const catalogListOf = (count: number) => [
  http.get(CATALOG_LIST_URL, () => HttpResponse.json(CATALOG_LIST.slice(0, count))),
  http.get(`${CATALOG_LIST_URL}/:publicId/photos/:photoId`, async () => {
    const image = await (await fetch(letniTaborImage)).arrayBuffer()
    return new HttpResponse(image, { headers: { "Content-Type": "image/jpeg" } })
  }),
]

export const publicEventHandlers = {
  /** The public catalog (F54-2a) and the photos of its cards. */
  catalogList: () => catalogListOf(CATALOG_LIST.length),
  /** Only the first `count` events of the catalog, for the landing preview. */
  catalogListOf,
  catalogListEmpty: () => [http.get(CATALOG_LIST_URL, () => HttpResponse.json([]))],
  catalogListFailed: () => [
    http.get(CATALOG_LIST_URL, () => HttpResponse.json({ statusCode: 500 }, { status: 500 })),
  ],
  detail: (event: PublicEvent = PUBLIC_EVENT) => [http.get(DETAIL, () => HttpResponse.json(event))],
  /** The catalog detail (F55) and its photos. */
  catalogDetail: (event: CatalogEvent = CATALOG_EVENT) => [
    http.get(CATALOG_DETAIL, () => HttpResponse.json(event)),
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
