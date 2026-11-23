import {
  changePreviewSchema,
  registrationChangeSchema,
  type ChangePreview,
  type ChangeSummaryData,
  type RegistrationChange,
} from "@/features/registrations/api/registrationChangeSchemas"
import {
  AVAILABLE_TERMS,
  OWN_REGISTRATION,
} from "@/features/registrations/fixtures/participantRegistrations"

// Story and test data for changes of the participant's own registration
// (F35-2a): what the server previews before a change and the stored changes.
// Turnus 1 is confirmed, Turnus 2 waitlisted, Turnus 3 free to move to.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const [T1, T2] = OWN_REGISTRATION.terms.map(({ status: _status, ...term }) => term)
const T3 = AVAILABLE_TERMS[2]!

const MONEY = { dueMinor: 450_000, paidMinor: 200_000, balanceMinor: 250_000 }

const summary = (overrides: Partial<ChangeSummaryData>): ChangeSummaryData => ({
  values: [],
  answers: [],
  needs: null,
  terms: [],
  original: MONEY,
  proposed: MONEY,
  ...overrides,
})

/** A new phone number: every active term stays as it is. */
export const PHONE_SUMMARY = summary({
  values: [{ field: "phone", original: "+420604123456", proposed: "+420731987654" }],
  terms: [
    { ...T1!, original: "confirmed", proposed: "confirmed" },
    { ...T2!, original: "waitlisted", proposed: "waitlisted" },
  ],
})

/** The waitlisted Turnus 2 moves to Turnus 3, where the organizer decides. */
export const MOVE_SUMMARY = summary({
  terms: [
    { ...T2!, original: "waitlisted", proposed: "cancelled" },
    { ...T3, original: null, proposed: "pending" },
  ],
})

/** The confirmed Turnus 1 moves to Turnus 3: the confirmed place is given up. */
export const RELEASING_MOVE_SUMMARY = summary({
  terms: [
    { ...T1!, original: "confirmed", proposed: "cancelled" },
    { ...T3, original: null, proposed: "pending" },
  ],
  proposed: { dueMinor: 0, paidMinor: 200_000, balanceMinor: -200_000 },
})

/** Turnus 3 is added next to the held terms: nothing is due before the organizer decides. */
export const ADD_TERM_SUMMARY = summary({
  terms: [{ ...T3, original: null, proposed: "pending" }],
})

/** Both terms wait for a decision: the widest review, with pending badges on both sides. */
export const PENDING_ADD_SUMMARY = summary({
  terms: [
    { ...T1!, original: "pending", proposed: "pending" },
    { ...T3, original: null, proposed: "pending" },
  ],
  original: { dueMinor: 0, paidMinor: 0, balanceMinor: 0 },
  proposed: { dueMinor: 0, paidMinor: 0, balanceMinor: 0 },
})

/** The confirmed Turnus 1 is unticked and Turnus 3 ticked: one term is given up, another added. */
export const REPLACE_TERM_SUMMARY = summary({
  terms: [
    { ...T1!, original: "confirmed", proposed: "cancelled" },
    { ...T3, original: null, proposed: "pending" },
  ],
  proposed: { dueMinor: 0, paidMinor: 200_000, balanceMinor: -200_000 },
})

/** Leaving the confirmed Turnus 1: the amount due drops, the payment stays. */
export const CANCEL_TERM_SUMMARY = summary({
  terms: [{ ...T1!, original: "confirmed", proposed: "cancelled" }],
  proposed: { dueMinor: 0, paidMinor: 200_000, balanceMinor: -200_000 },
})

/** Leaving the whole registration. */
export const CANCEL_ALL_SUMMARY = summary({
  terms: [
    { ...T1!, original: "confirmed", proposed: "cancelled" },
    { ...T2!, original: "waitlisted", proposed: "cancelled" },
  ],
  proposed: { dueMinor: 0, paidMinor: 200_000, balanceMinor: -200_000 },
})

export function makeChangePreview(overrides: Partial<ChangePreview> = {}): ChangePreview {
  return changePreviewSchema.parse({
    version: OWN_REGISTRATION.version,
    requiresApproval: false,
    kinds: ["data"],
    moves: [],
    summary: PHONE_SUMMARY,
    ...overrides,
  })
}

export const ADD_TERM_PREVIEW = makeChangePreview({
  kinds: ["add_terms"],
  summary: ADD_TERM_SUMMARY,
})

export const PENDING_ADD_PREVIEW = makeChangePreview({
  requiresApproval: true,
  kinds: ["add_terms"],
  summary: PENDING_ADD_SUMMARY,
})

export const REPLACE_TERM_PREVIEW = makeChangePreview({
  kinds: ["cancel_terms", "add_terms"],
  summary: REPLACE_TERM_SUMMARY,
})

export const RELEASING_MOVE_PREVIEW = makeChangePreview({
  kinds: ["move"],
  moves: [
    {
      fromTermId: T1!.termId,
      toTermId: T3.termId,
      resultStatus: "pending",
      requiresReleaseConsent: true,
    },
  ],
  summary: RELEASING_MOVE_SUMMARY,
})

/** A stored change of the own registration; waiting for the organizer by default. */
export function makeOwnChange(overrides: Partial<RegistrationChange> = {}): RegistrationChange {
  return registrationChangeSchema.parse({
    id: uuid(701),
    registrationId: OWN_REGISTRATION.id,
    status: "pending",
    kinds: ["move"],
    createdAt: "2027-03-10T10:00:00.000Z",
    decidedAt: null,
    summary: MOVE_SUMMARY,
    isStale: false,
    participant: {
      firstName: OWN_REGISTRATION.contact.firstName,
      lastName: OWN_REGISTRATION.contact.lastName,
      email: OWN_REGISTRATION.contact.email,
    },
    ...overrides,
  })
}
