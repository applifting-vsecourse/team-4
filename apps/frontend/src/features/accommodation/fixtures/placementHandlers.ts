import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { ConfirmableWarning } from "@/features/accommodation/api/placementSchemas"
import {
  placementResponse,
  PLACEMENTS_STORE,
  roomWarnings,
  type PlacementStore,
} from "@/features/accommodation/fixtures/placements"

// MSW handlers for the saved room placements of a term (F14-2), with the
// backend's rules (#337): a placement whose room would warn is refused with
// 409 `placement_warnings` until the organizer confirms every warning, a
// locked placement is neither moved nor removed, an unavailable room takes
// nobody new. Install with `msw.use(...)` in a story's `beforeEach`.

export const PLACEMENTS =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/placements"

const conflict = (code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ statusCode: 409, code, message, ...extra }, { status: 409 })

const LOCKED = () =>
  conflict("placement_locked", "Umístění je uzamčené. Před přesunem nebo odebráním ho odemkněte.")

/** The placements of a term, kept in memory: each save changes what the next read returns. */
export function placementHandlers(initial: PlacementStore = PLACEMENTS_STORE) {
  const store: PlacementStore = structuredClone(initial)
  const answer = () => HttpResponse.json(placementResponse(store))
  const find = (id: unknown) => store.people.find((entry) => entry.registrationId === id)

  return [
    http.get(`${env.VITE_API_URL}${PLACEMENTS}`, answer),
    http.put(`${env.VITE_API_URL}${PLACEMENTS}/:registrationId`, async ({ params, request }) => {
      const input = (await request.json()) as {
        roomId: string
        confirmWarnings?: ConfirmableWarning[]
        lock?: boolean
      }
      const person = find(params.registrationId)
      const room = store.rooms.find((entry) => entry.roomId === input.roomId)
      if (!person || !room) return HttpResponse.json({ statusCode: 404 }, { status: 404 })
      if (person.roomId === room.roomId) {
        if (input.lock !== undefined) person.isLocked = input.lock
        return answer()
      }
      if (person.isLocked) return LOCKED()
      if (!room.isAvailable) {
        return conflict("room_unavailable", "Pokoj v tomto termínu není k dispozici.")
      }
      const values = [
        ...store.people.filter((entry) => entry.roomId === room.roomId).map((entry) => entry.value),
        person.value,
      ]
      const warnings = roomWarnings(room, values).filter(
        (warning): warning is ConfirmableWarning => warning !== "room_unavailable",
      )
      const confirmed = input.confirmWarnings ?? []
      if (warnings.some((warning) => !confirmed.includes(warning))) {
        return conflict(
          "placement_warnings",
          "Umístění porušuje pravidla pokoje. Uložte ho jen jako potvrzenou výjimku.",
          { warnings },
        )
      }
      Object.assign(person, {
        roomId: room.roomId,
        isLocked: input.lock ?? false,
        confirmedWarnings: warnings,
      })
      return answer()
    }),
    http.delete(`${env.VITE_API_URL}${PLACEMENTS}/:registrationId`, ({ params }) => {
      const person = find(params.registrationId)
      if (!person) return HttpResponse.json({ statusCode: 404 }, { status: 404 })
      if (person.isLocked) return LOCKED()
      Object.assign(person, { roomId: null, isLocked: false, confirmedWarnings: [] })
      return answer()
    }),
    http.put(
      `${env.VITE_API_URL}${PLACEMENTS}/:registrationId/lock`,
      async ({ params, request }) => {
        const { isLocked } = (await request.json()) as { isLocked: boolean }
        const person = find(params.registrationId)
        if (!person) return HttpResponse.json({ statusCode: 404 }, { status: 404 })
        if (!person.roomId) return conflict("not_placed", "Účastník nemá přidělený pokoj.")
        person.isLocked = isLocked
        return answer()
      },
    ),
  ]
}
