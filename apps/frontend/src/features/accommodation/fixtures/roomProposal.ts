import {
  roomProposalPreferencesSchema,
  termRoomProposalSchema,
  termWishesSchema,
  type ProposalLayoutData,
  type RoomProposalPreferences,
  type StoredProposalData,
  type TermRoomProposalData,
  type TermWishes,
  type WishState,
} from "@/features/accommodation/api/roomProposalSchemas"

// Preview and test data for the room proposal of a term (#365, #385). Every
// factory parses its result with the API schema; values are fixed so stories
// render the same every time.

/** The id of "Přání" in the API. */
const WISHES = "roommate-wishes"

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const ROOMS = {
  javor: uuid(301),
  buk: uuid(302),
  dub: uuid(303),
  lipa: uuid(304),
}

type Person = [n: number, first: string, last: string, room: keyof typeof ROOMS | null]

// Confirmed participants of Turnus 1 and the room the proposal gives them.
const PEOPLE: Person[] = [
  [201, "Tereza", "Nováková", "javor"],
  [202, "Anna", "Procházková", "javor"],
  [203, "Lucie", "Sedláčková", "javor"],
  [204, "Jan", "Dvořák", "buk"],
  [205, "Petr", "Svoboda", "buk"],
  [206, "Ondřej", "Černý", "buk"],
  [207, "Eliška", "Malá", "dub"],
  [208, "Tomáš", "Král", null],
]

const LAYOUT: ProposalLayoutData = {
  isComplete: true,
  rooms: [
    { id: ROOMS.buk, label: "Chata Buk", isAvailable: true, baseBeds: 3, extraBeds: 0 },
    { id: ROOMS.dub, label: "Chata Dub", isAvailable: true, baseBeds: 2, extraBeds: 1 },
    { id: ROOMS.javor, label: "Chata Javor", isAvailable: true, baseBeds: 3, extraBeds: 0 },
    { id: ROOMS.lipa, label: "Chata Lípa", isAvailable: false, baseBeds: 0, extraBeds: 0 },
  ].map((room) => ({
    ...room,
    personIds: PEOPLE.filter(([, , , key]) => key && ROOMS[key] === room.id).map(([n]) => uuid(n)),
    warning: null,
  })),
  people: PEOPLE.map(([n, firstName, lastName, key]) => ({
    id: uuid(n),
    firstName,
    lastName,
    value: n <= 203 || n === 207 ? "female" : "male",
    roomId: key ? ROOMS[key] : null,
    savedRoomId: null,
    isLocked: false,
    reason: key ? null : "H",
    isLockConflict: false,
    change: key ? "new" : null,
  })),
  // One wish of each state in this layout (#317).
  wishes: [
    { from: uuid(201), to: uuid(202), state: "satisfied" },
    { from: uuid(207), to: uuid(203), state: "unsatisfied" },
    { from: uuid(208), to: uuid(204), state: "unplaced" },
    { from: uuid(205), to: uuid(201), state: "impossible" },
  ],
  scores: { placed: 7, crossTerm: 0, preferences: [0], moves: 0, extraBeds: 0, rooms: 3 },
  summary: {
    placed: 7,
    unplaced: 1,
    lockConflicts: 0,
    added: 7,
    moved: 0,
    removed: 0,
    rooms: 3,
    extraBeds: 0,
  },
}

/** The rooms' people follow each person's proposed room, as the API builds them. */
const withPeople = (
  layout: ProposalLayoutData,
  people: ProposalLayoutData["people"],
): ProposalLayoutData => ({
  ...layout,
  people,
  rooms: layout.rooms.map((room) => ({
    ...room,
    personIds: people.filter((person) => person.roomId === room.id).map((person) => person.id),
  })),
})

/** The same term once placements are saved: one move, one lock, one lost room. */
const WITH_SAVED: ProposalLayoutData = {
  ...withPeople(
    LAYOUT,
    LAYOUT.people.map((person) => {
      switch (person.id) {
        case uuid(201):
          return {
            ...person,
            savedRoomId: ROOMS.javor,
            isLocked: true,
            change: "unchanged" as const,
          }
        case uuid(202):
        case uuid(203):
          return { ...person, savedRoomId: ROOMS.javor, change: "unchanged" as const }
        case uuid(204):
          return { ...person, savedRoomId: ROOMS.dub, change: "moved" as const }
        case uuid(207):
          return {
            ...person,
            savedRoomId: ROOMS.lipa,
            isLocked: true,
            roomId: null,
            isLockConflict: true,
            change: null,
          }
        case uuid(208):
          return {
            ...person,
            savedRoomId: ROOMS.buk,
            reason: "K" as const,
            change: "removed" as const,
          }
        default:
          return person
      }
    }),
  ),
  summary: { ...LAYOUT.summary, placed: 6, lockConflicts: 1, added: 2, moved: 1, removed: 1 },
}

const OWNER = { id: "organizer-1", name: "Marie Králová" }

const stored = (overrides: Partial<StoredProposalData> = {}): StoredProposalData => ({
  id: uuid(801),
  status: "solved",
  triggeredBy: OWNER,
  startedAt: "2027-03-12T13:31:58Z",
  finishedAt: "2027-03-12T13:32:04Z",
  layoutVersion: 4,
  isCurrent: true,
  layout: LAYOUT,
  ...overrides,
})

export type ProposalPreset =
  | "current"
  | "withSaved"
  | "incomplete"
  | "stale"
  | "running"
  | "none"
  | "failed"
  | "timeout"
  | "empty"
  | "noRooms"
  | "runningFirst"
  | "failedStale"

/** The room proposal of Turnus 1 in one of the states #385 shows. */
export function makeTermRoomProposal(
  preset: ProposalPreset = "current",
  overrides: Partial<TermRoomProposalData> = {},
): TermRoomProposalData {
  const base = (status: TermRoomProposalData["status"], proposal: StoredProposalData | null) => ({
    mode: "manual" as const,
    status,
    layoutVersion: 4,
    scheduledAt: null,
    proposal,
    lastSolved: proposal?.status === "solved" ? proposal : null,
  })
  const failed = stored({ id: uuid(802), status: "failed", layout: null })
  const byPreset: Record<ProposalPreset, TermRoomProposalData> = {
    current: base("current", stored()),
    withSaved: base("current", stored({ layout: WITH_SAVED })),
    incomplete: base("current", stored({ layout: { ...LAYOUT, isComplete: false } })),
    stale: base("stale", stored({ isCurrent: false, layoutVersion: 3 })),
    running: base("running", stored({ isCurrent: false, layoutVersion: 3 })),
    none: base("none", null),
    failed: { ...base("failed", failed), lastSolved: stored() },
    failedStale: {
      ...base("failed", failed),
      lastSolved: stored({ isCurrent: false, layoutVersion: 3 }),
    },
    runningFirst: base("running", null),
    noRooms: base(
      "current",
      stored({
        layout: {
          ...withPeople(
            { ...LAYOUT, rooms: LAYOUT.rooms.map((room) => ({ ...room, isAvailable: false })) },
            LAYOUT.people.map((person) => ({
              ...person,
              roomId: null,
              reason: "N" as const,
              change: null,
            })),
          ),
          summary: { ...LAYOUT.summary, placed: 0, unplaced: 8, added: 0, rooms: 0 },
        },
      }),
    ),
    timeout: base("timeout", stored({ status: "timeout", layout: null })),
    empty: base(
      "current",
      stored({
        layout: {
          ...LAYOUT,
          rooms: LAYOUT.rooms.map((room) => ({ ...room, personIds: [] })),
          people: [],
          summary: { ...LAYOUT.summary, placed: 0, unplaced: 0, added: 0, rooms: 0 },
        },
      }),
    ),
  }
  return termRoomProposalSchema.parse({ ...byPreset[preset], ...overrides })
}

const GENDER_SOFT = {
  attribute: "gender",
  values: ["female", "male", "other", "undisclosed"],
  defaultNeutralValues: ["other", "undisclosed"],
}

export type PreferencesPreset = "default" | "ranked" | "empty"

/**
 * The soft preferences of the room proposal (#389). `default`: a new event
 * splitting rooms by gender, so only "Přání" can be ranked; `ranked`: no
 * hard attribute, gender above "Přání"; `empty`: nothing ranked.
 */
export function makeRoomProposalPreferences(
  preset: PreferencesPreset = "default",
): RoomProposalPreferences {
  const byPreset: Record<PreferencesPreset, RoomProposalPreferences> = {
    default: {
      preferences: [{ id: WISHES }],
      wishes: WISHES,
      attributes: [],
    },
    ranked: {
      preferences: [{ id: "gender", neutralValues: ["other", "undisclosed"] }, { id: WISHES }],
      wishes: WISHES,
      attributes: [GENDER_SOFT],
    },
    empty: { preferences: [], wishes: WISHES, attributes: [GENDER_SOFT] },
  }
  return roomProposalPreferencesSchema.parse(byPreset[preset])
}

const person = (n: number) => {
  const [, first, last] = PEOPLE.find(([id]) => id === n)!
  return { registrationId: uuid(n), name: `${first} ${last}` }
}

export type WishesPreset = "unsaved" | "saved" | "empty"

/**
 * The usable roommate wishes of Turnus 1 (#317), the same four as in the
 * proposal. `unsaved`: nobody has a saved room yet; `saved`: the placements
 * of the `withSaved` proposal; `empty`: no usable wish.
 */
export function makeTermWishes(preset: WishesPreset = "saved"): TermWishes {
  const wishes: [number, number, Record<Exclude<WishesPreset, "empty">, WishState>][] = [
    [201, 202, { unsaved: "unplaced", saved: "satisfied" }],
    [207, 203, { unsaved: "unplaced", saved: "unsatisfied" }],
    [208, 204, { unsaved: "unplaced", saved: "unsatisfied" }],
    [205, 201, { unsaved: "impossible", saved: "impossible" }],
  ]
  return termWishesSchema.parse({
    wishes:
      preset === "empty"
        ? []
        : wishes.map(([from, to, saved]) => ({
            from: person(from),
            to: person(to),
            saved: saved[preset],
          })),
  })
}
