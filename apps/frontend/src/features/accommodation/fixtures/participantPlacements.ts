import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import {
  participantRoomPlacementsSchema,
  type ParticipantRoomPlacements,
} from "@/features/accommodation/api/participantPlacementSchemas"

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

// The own rooms of a participant's registration (S4-02, #341): Jana is
// confirmed for Turnus 1 (published) of the summer camp. Install with
// `msw.use(...)`.

export const PARTICIPANT_PLACEMENTS = "/participant/registrations/:registrationId/room-placements"

const TURNUS_1 = {
  termId: uuid(101),
  label: "Turnus 1",
  startDate: "2027-07-04",
  endDate: "2027-07-17",
}

const TURNUS_2 = {
  termId: uuid(102),
  label: "Turnus 2",
  startDate: "2027-08-01",
  endDate: "2027-08-14",
}

/** Published: a room and one wish in each state. */
export const PUBLISHED_ROOM: ParticipantRoomPlacements = participantRoomPlacementsSchema.parse({
  terms: [
    {
      ...TURNUS_1,
      isPublished: true,
      room: { label: "Chatka 2" },
      wishes: [
        { registrationId: uuid(11), name: "Anna Procházková", state: "satisfied" },
        { registrationId: uuid(12), name: "Eva Malá", state: "unplaced" },
        { registrationId: uuid(13), name: "Petr Dvořák", state: "unsatisfied" },
      ],
    },
  ],
})

export const NOT_PUBLISHED: ParticipantRoomPlacements = participantRoomPlacementsSchema.parse({
  terms: [{ ...TURNUS_1, isPublished: false }],
})

export const WITHOUT_ROOM: ParticipantRoomPlacements = participantRoomPlacementsSchema.parse({
  terms: [
    {
      ...TURNUS_1,
      isPublished: true,
      room: null,
      wishes: [{ registrationId: uuid(11), name: "Anna Procházková", state: "unplaced" }],
    },
  ],
})

export const WITHOUT_WISHES: ParticipantRoomPlacements = participantRoomPlacementsSchema.parse({
  terms: [{ ...TURNUS_1, isPublished: true, room: { label: "Chatka 2" }, wishes: [] }],
})

/** Two confirmed terms, only the first published. */
export const ONE_OF_TWO_PUBLISHED: ParticipantRoomPlacements =
  participantRoomPlacementsSchema.parse({
    terms: [PUBLISHED_ROOM.terms[0], { ...TURNUS_2, isPublished: false }],
  })

export const participantPlacementHandlers = (
  answer: ParticipantRoomPlacements = PUBLISHED_ROOM,
) => [http.get(`${env.VITE_API_URL}${PARTICIPANT_PLACEMENTS}`, () => HttpResponse.json(answer))]
