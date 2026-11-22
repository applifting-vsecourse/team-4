import {
  termPlacementsResponseSchema,
  type ConfirmableWarning,
  type TermPlacementsResponse,
} from "@/features/accommodation/api/placementSchemas"

// Preview data of the room placements of one term (F14-2), in the shape the
// backend (#337) answers, parsed with the API schema so it can't drift from
// the contract. The `*_STORE` states are what the MSW handlers keep and change.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const CHATKA_1 = uuid(501)
const CHATKA_2 = uuid(502)
const CHATKA_3 = uuid(503)
const SRUB = uuid(504)

/** A room of the event with its beds in the term. */
export type StoredRoom = {
  roomId: string
  label: string
  isAvailable: boolean
  baseBeds: number
  extraBeds: number
}

/** A confirmed participant of the term and their placement, as the backend stores it. */
export type StoredPerson = {
  registrationId: string
  name: string
  value: string | null
  roomId: string | null
  isLocked: boolean
  confirmedWarnings: ConfirmableWarning[]
}

export type PlacementStore = {
  hardAttribute: string | null
  rooms: StoredRoom[]
  people: StoredPerson[]
}

const room = (roomId: string, label: string, baseBeds: number, extraBeds = 0): StoredRoom => ({
  roomId,
  label,
  isAvailable: true,
  baseBeds,
  extraBeds,
})

const ROOMS: StoredRoom[] = [
  room(CHATKA_1, "Chatka 1", 4, 1),
  room(CHATKA_2, "Chatka 2", 4),
  room(CHATKA_3, "Chatka 3", 4),
  room(SRUB, "Srub u lesa", 2),
]

const person = (
  n: number,
  name: string,
  value: string | null,
  roomId: string | null = null,
  isLocked = false,
  confirmedWarnings: ConfirmableWarning[] = [],
): StoredPerson => ({
  registrationId: uuid(600 + n),
  name,
  value,
  roomId,
  isLocked,
  confirmedWarnings,
})

const PEOPLE: StoredPerson[] = [
  person(1, "Anna Dvořáková", "female", CHATKA_1),
  person(2, "Eliška Horáková", "female", CHATKA_1),
  person(3, "Tereza Malá", "female", CHATKA_1),
  person(4, "Klára Svobodová", "female", CHATKA_1),
  person(5, "Jakub Novák", "male", CHATKA_2),
  person(6, "Ondřej Černý", "male", CHATKA_2),
  // Partners placed together on purpose; the exception is locked.
  person(7, "Petr Kučera", "male", SRUB, true),
  person(8, "Lucie Kučerová", "female", SRUB, true, ["mixed"]),
  person(9, "Matěj Procházka", "male"),
  person(10, "Barbora Veselá", "female"),
]

const byLabel = (a: StoredRoom, b: StoredRoom) => a.label.localeCompare(b.label, "cs")

const byName = <T extends { name: string; registrationId: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name, "cs") || (a.registrationId < b.registrationId ? -1 : 1)

/** The warnings of a room holding people with these values, as the backend words them. */
export function roomWarnings(
  stored: StoredRoom,
  values: (string | null)[],
): TermPlacementsResponse["rooms"][number]["warnings"] {
  if (values.length === 0) return []
  const warnings: TermPlacementsResponse["rooms"][number]["warnings"] = []
  if (new Set(values.filter((value) => value !== null)).size > 1) warnings.push("mixed")
  if (!stored.isAvailable) warnings.push("room_unavailable")
  else if (values.length > stored.baseBeds + stored.extraBeds) warnings.push("over_capacity")
  else if (values.length > stored.baseBeds) warnings.push("extra_bed")
  return warnings
}

/** The backend's answer for the stored placements. */
export function placementResponse(store: PlacementStore): TermPlacementsResponse {
  const people = [...store.people].sort(byName)
  return termPlacementsResponseSchema.parse({
    hardAttribute: store.hardAttribute,
    rooms: [...store.rooms].sort(byLabel).map((stored) => {
      const occupants = people.filter((entry) => entry.roomId === stored.roomId)
      return {
        ...stored,
        occupants: occupants.map(
          ({ registrationId, name, value, isLocked, confirmedWarnings }) => ({
            registrationId,
            name,
            value,
            isLocked,
            confirmedWarnings,
          }),
        ),
        warnings: roomWarnings(
          stored,
          occupants.map((entry) => entry.value),
        ),
      }
    }),
    unplaced: people
      .filter((entry) => entry.roomId === null)
      .map(({ registrationId, name, value }) => ({ registrationId, name, value })),
  })
}

const unplacedAll = (people: StoredPerson[]) =>
  people.map((entry) => ({ ...entry, roomId: null, isLocked: false, confirmedWarnings: [] }))

/** Rooms partly taken: a full room with a free extra bed, an empty room, a locked mixed room, two without a room. */
export const PLACEMENTS_STORE: PlacementStore = {
  hardAttribute: "gender",
  rooms: ROOMS,
  people: PEOPLE,
}

/** Nobody has a room yet. */
export const WITHOUT_PLACEMENTS_STORE: PlacementStore = {
  ...PLACEMENTS_STORE,
  people: unplacedAll(PEOPLE),
}

/** Rooms are not split by any attribute. */
export const NOT_SPLIT_STORE: PlacementStore = {
  ...PLACEMENTS_STORE,
  hardAttribute: null,
  people: PEOPLE.map((entry) => ({ ...entry, value: null, confirmedWarnings: [] })),
}

/** Active gender rule with an unplaced participant lacking a usable value. */
export const WITHOUT_VALUE_STORE: PlacementStore = {
  ...PLACEMENTS_STORE,
  people: PEOPLE.map((entry) =>
    entry.name === "Matěj Procházka" ? { ...entry, value: null } : entry,
  ),
}

export const WITHOUT_PEOPLE_STORE: PlacementStore = { ...PLACEMENTS_STORE, people: [] }

export const WITHOUT_ROOMS_STORE: PlacementStore = {
  ...PLACEMENTS_STORE,
  rooms: [],
  people: unplacedAll(PEOPLE),
}

/** Srub u lesa is no longer available in the term, while the partners are still in it. */
export const UNAVAILABLE_ROOM_STORE: PlacementStore = {
  ...PLACEMENTS_STORE,
  rooms: ROOMS.map((entry) =>
    entry.roomId === SRUB ? { ...entry, isAvailable: false, baseBeds: 0 } : entry,
  ),
}

/** Ondřej's answer changed after placing: Chatka 2 is mixed, and nobody confirmed it. */
export const TURNED_MIXED_STORE: PlacementStore = {
  ...PLACEMENTS_STORE,
  people: PEOPLE.map((entry) =>
    entry.name === "Ondřej Černý" ? { ...entry, value: "female" } : entry,
  ),
}

export const TERM_PLACEMENTS = placementResponse(PLACEMENTS_STORE)
export const TERM_WITHOUT_PLACEMENTS = placementResponse(WITHOUT_PLACEMENTS_STORE)
export const TERM_NOT_SPLIT = placementResponse(NOT_SPLIT_STORE)
