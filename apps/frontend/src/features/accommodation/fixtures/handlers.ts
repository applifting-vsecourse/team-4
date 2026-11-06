import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import {
  makeRunEvidence,
  makeRuns,
  makeTermEvaluation,
} from "@/features/accommodation/fixtures/evaluation"

// MSW handlers for the term evaluation of an event (S3-01). Install with
// `msw.use(...)` in a story's `beforeEach`.

const BASE = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/accommodation`

export const accommodationHandlers = {
  evaluation: () => [
    http.get(`${BASE}/evaluation-mode`, () => HttpResponse.json({ mode: "automatic" })),
    http.put(`${BASE}/evaluation-mode`, async ({ request }) =>
      HttpResponse.json(await request.json()),
    ),
    http.get(`${BASE}/terms/:termId/evaluation`, () => HttpResponse.json(makeTermEvaluation())),
    http.post(`${BASE}/terms/:termId/evaluation`, () =>
      HttpResponse.json(makeTermEvaluation({ status: "running" }), { status: 202 }),
    ),
    http.get(`${BASE}/terms/:termId/runs`, () => HttpResponse.json({ runs: makeRuns() })),
    http.get(`${BASE}/runs/:runId`, () => HttpResponse.json(makeRunEvidence())),
  ],
}
