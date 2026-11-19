import {
  termPlacementsSchema,
  type TermPlacements,
} from "@/features/accommodation/api/placementSchemas"

// Preview data of the room placements of one term (F14-2), parsed with the
// API schema so it can't drift from the contract.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

export const PLACEMENT_TERM = { id: uuid(101), label: "Turnus 1" }

const CHATKA_1 = uuid(501)
const CHATKA_2 = uuid(502)
const CHATKA_3 = uuid(503)
const SRUB = uuid(504)

const ROOMS = [
  { id: CHATKA_1, label: "Chatka 1", baseBeds: 4, extraBeds: 1 },
  { id: CHATKA_2, label: "Chatka 2", baseBeds: 4, extraBeds: 0 },
  { id: CHATKA_3, label: "Chatka 3", baseBeds: 4, extraBeds: 0 },
  { id: SRUB, label: "Srub u lesa", baseBeds: 2, extraBeds: 0 },
]

const person = (
  n: number,
  firstName: string,
  lastName: string,
  value: string,
  roomId: string | null = null,
  isLocked = false,
) => ({ registrationId: uuid(600 + n), firstName, lastName, value, roomId, isLocked })

const PEOPLE = [
  person(1, "Anna", "Dvořáková", "female", CHATKA_1),
  person(2, "Eliška", "Horáková", "female", CHATKA_1),
  person(3, "Tereza", "Malá", "female", CHATKA_1),
  person(4, "Klára", "Svobodová", "female", CHATKA_1),
  person(5, "Jakub", "Novák", "male", CHATKA_2),
  person(6, "Ondřej", "Černý", "male", CHATKA_2),
  // Partners placed together on purpose; the exception is locked.
  person(7, "Petr", "Kučera", "male", SRUB, true),
  person(8, "Lucie", "Kučerová", "female", SRUB, true),
  person(9, "Matěj", "Procházka", "male"),
  person(10, "Barbora", "Veselá", "female"),
]

/** Rooms partly taken: a full room with a free extra bed, an empty room, a locked mixed room, two without a room. */
export const TERM_PLACEMENTS: TermPlacements = termPlacementsSchema.parse({
  termId: PLACEMENT_TERM.id,
  hardAttribute: "gender",
  rooms: ROOMS,
  people: PEOPLE,
})

/** Nobody has a room yet. */
export const TERM_WITHOUT_PLACEMENTS: TermPlacements = termPlacementsSchema.parse({
  ...TERM_PLACEMENTS,
  people: PEOPLE.map((entry) => ({ ...entry, roomId: null, isLocked: false })),
})

/** Rooms are not split by any attribute. */
export const TERM_NOT_SPLIT: TermPlacements = termPlacementsSchema.parse({
  ...TERM_PLACEMENTS,
  hardAttribute: null,
  people: PEOPLE.map((entry) => ({ ...entry, value: null })),
})

export const TERM_WITHOUT_PEOPLE: TermPlacements = termPlacementsSchema.parse({
  ...TERM_PLACEMENTS,
  people: [],
})

export const TERM_WITHOUT_ROOMS: TermPlacements = termPlacementsSchema.parse({
  ...TERM_PLACEMENTS,
  rooms: [],
  people: PEOPLE.map((entry) => ({ ...entry, roomId: null, isLocked: false })),
})
