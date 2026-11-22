import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import {
  roomPublicationSchema,
  type RoomPublication,
} from "@/features/accommodation/api/publicationSchemas"

// MSW handlers for the publication of a term's room placements (S4-02,
// #341), kept in memory per term: publishing a published term keeps its
// date, taking it back clears it. Install with `msw.use(...)`.

export const PUBLICATION =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/publication"

export const PUBLISHED_AT = "2027-06-20T08:30:00.000Z"

/** Term id → when it was published; a term not listed is not published. */
export type PublicationStore = Record<string, string>

const answer = (publishedAt: string | undefined): RoomPublication =>
  roomPublicationSchema.parse({
    isPublished: publishedAt !== undefined,
    publishedAt: publishedAt ?? null,
  })

export function publicationHandlers(initial: PublicationStore = {}) {
  const store: PublicationStore = { ...initial }
  const url = `${env.VITE_API_URL}${PUBLICATION}`
  return [
    http.get(url, ({ params }) => HttpResponse.json(answer(store[params.termId as string]))),
    http.put(url, ({ params }) => {
      const termId = params.termId as string
      store[termId] ??= new Date().toISOString()
      return HttpResponse.json(answer(store[termId]))
    }),
    http.delete(url, ({ params }) => {
      delete store[params.termId as string]
      return HttpResponse.json(answer(undefined))
    }),
  ]
}
