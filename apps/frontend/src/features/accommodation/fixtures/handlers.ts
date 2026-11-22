import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type {
  EventAttribute,
  TermEvaluationData,
} from "@/features/accommodation/api/evaluationSchemas"
import type {
  RoomProposalPreferences,
  TermRoomProposalData,
  TermWishes,
} from "@/features/accommodation/api/roomProposalSchemas"
import {
  makeHardAttributeSetting,
  makeMoves,
  makeRegistrationAccommodation,
  makeRunEvidence,
  makeRuns,
  makeTermEvaluation,
} from "@/features/accommodation/fixtures/evaluation"
import {
  makeRoomProposalPreferences,
  makeTermRoomProposal,
  makeTermWishes,
} from "@/features/accommodation/fixtures/roomProposal"

// MSW handlers for the term evaluation of an event (S3-01, S3-03). Install with
// `msw.use(...)` in a story's `beforeEach`.

const EVENT = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId`
const BASE = `${EVENT}/accommodation`
const REGISTRATION = `${EVENT}/registrations/:registrationId/accommodation`

export const accommodationHandlers = {
  /** The evaluation of the term, changed for one story (stale, failed, conflict…). */
  termEvaluation: (evaluation: TermEvaluationData) => [
    http.get(`${BASE}/terms/:termId/evaluation`, () => HttpResponse.json(evaluation)),
  ],
  /** The event's hard attribute, `null` when rooms are not split (#384). */
  hardAttribute: (hardAttribute: string | null) => [
    http.get(`${BASE}/hard-attribute`, () =>
      HttpResponse.json(makeHardAttributeSetting(hardAttribute)),
    ),
  ],
  /** Gender and the event's own questions (#485); a save keeps what was sent. */
  attributeRules: (questions: EventAttribute[], hardAttribute: string | null = null) => {
    let setting = makeHardAttributeSetting(hardAttribute, questions)
    return [
      http.get(`${BASE}/hard-attribute`, () => HttpResponse.json(setting)),
      http.put(`${BASE}/hard-attribute`, async ({ request }) => {
        const sent = (await request.json()) as {
          hardAttribute: string | null
          nonDeterminingValues: string[]
        }
        setting = { ...setting, ...sent }
        return HttpResponse.json(setting)
      }),
    ]
  },
  /** The soft preferences of the room proposal (#389); a save keeps the sent list. */
  roomProposalPreferences: (setting: RoomProposalPreferences = makeRoomProposalPreferences()) => [
    http.get(`${BASE}/room-proposal-preferences`, () => HttpResponse.json(setting)),
    http.put(`${BASE}/room-proposal-preferences`, async ({ request }) => {
      const { preferences } = (await request.json()) as Pick<RoomProposalPreferences, "preferences">
      return HttpResponse.json({ ...setting, preferences })
    }),
  ],
  evaluation: () => [
    ...accommodationHandlers.roomProposalPreferences(),
    http.get(`${BASE}/evaluation-mode`, () => HttpResponse.json({ mode: "automatic" })),
    http.get(`${BASE}/hard-attribute`, () => HttpResponse.json(makeHardAttributeSetting())),
    http.put(`${BASE}/hard-attribute`, async ({ request }) => {
      const { hardAttribute } = (await request.json()) as { hardAttribute: string | null }
      return HttpResponse.json(makeHardAttributeSetting(hardAttribute))
    }),
    http.put(`${BASE}/evaluation-mode`, async ({ request }) =>
      HttpResponse.json(await request.json()),
    ),
    http.get(`${BASE}/terms/:termId/evaluation`, () => HttpResponse.json(makeTermEvaluation())),
    http.post(`${BASE}/terms/:termId/evaluation`, () =>
      HttpResponse.json(makeTermEvaluation({ status: "running" }), { status: 202 }),
    ),
    http.post(`${BASE}/terms/:termId/confirmations`, () =>
      HttpResponse.json({ confirmed: [], isReplay: false }),
    ),
    http.post(`${BASE}/terms/:termId/registrations/:registrationId/decision`, () =>
      HttpResponse.json({ status: "confirmed" }),
    ),
    http.get(`${BASE}/terms/:termId/runs`, () => HttpResponse.json({ runs: makeRuns() })),
    http.get(`${BASE}/terms/:termId/order/moves`, () => HttpResponse.json(makeMoves())),
    http.post(`${BASE}/terms/:termId/order/moves`, () =>
      HttpResponse.json(makeTermEvaluation({ status: "stale" })),
    ),
    http.get(`${BASE}/runs/:runId`, () => HttpResponse.json(makeRunEvidence())),
    http.get(REGISTRATION, () => HttpResponse.json(makeRegistrationAccommodation())),
    http.put(`${REGISTRATION}/determination`, () =>
      HttpResponse.json(makeRegistrationAccommodation()),
    ),
  ],
  /** The room proposal of the term, changed for one story (stale, failed…). */
  termRoomProposal: (proposal: TermRoomProposalData) => [
    http.get(`${BASE}/terms/:termId/room-proposal`, () => HttpResponse.json(proposal)),
  ],
  /** The usable roommate wishes of the term, changed for one story (#317). */
  termWishes: (wishes: TermWishes) => [
    http.get(`${BASE}/terms/:termId/roommate-wishes`, () => HttpResponse.json(wishes)),
  ],
  /** The room proposal mode and the proposal of a term (#365, #385). */
  roomProposal: () => [
    http.get(`${BASE}/room-proposal-mode`, () => HttpResponse.json({ mode: "manual" })),
    http.put(`${BASE}/room-proposal-mode`, async ({ request }) =>
      HttpResponse.json(await request.json()),
    ),
    http.get(`${BASE}/terms/:termId/room-proposal`, () =>
      HttpResponse.json(makeTermRoomProposal()),
    ),
    http.post(`${BASE}/terms/:termId/room-proposal`, () =>
      HttpResponse.json(makeTermRoomProposal("running"), { status: 202 }),
    ),
    // Přání na spolubydlící (#317) of a term, with their saved state (#365).
    http.get(`${BASE}/terms/:termId/roommate-wishes`, () => HttpResponse.json(makeTermWishes())),
    // "Použít návrh" (#390, #365).
    http.post(`${BASE}/terms/:termId/room-proposal/apply`, () =>
      HttpResponse.json({ added: 2, moved: 1, removed: 1, layoutVersion: 5 }),
    ),
  ],
}
