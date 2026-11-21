import { z } from "zod"

import { evaluationModeSchema } from "@/features/accommodation/api/evaluationSchemas"

/**
 * The state of a roommate wish in a layout (#317, phase-2 spec §5.3). When
 * several apply, the first wins, as the solver decides it (`wishStates`):
 * same room ⇒ `satisfied` (also a manual placement of different values);
 * else different effective values of the hard attribute ⇒ `impossible`;
 * else at least one without a room ⇒ `unplaced`; else `unsatisfied`.
 */
export const wishStateSchema = z.enum(["satisfied", "unsatisfied", "unplaced", "impossible"])

export type WishState = z.infer<typeof wishStateSchema>

// The room proposal API of #365 (Ubytování → Návrh pokojů, Nastavení →
// Automatizace). A proposal only proposes: it never changes a saved placement.

export const roomProposalModeResponseSchema = z.object({ mode: evaluationModeSchema })

export const roomProposalStatusSchema = z.enum([
  "none",
  "running",
  "current",
  "stale",
  "failed",
  "timeout",
])
export type RoomProposalStatus = z.infer<typeof roomProposalStatusSchema>

const placementChangeSchema = z.enum(["new", "moved", "removed", "unchanged"])
export type PlacementChange = z.infer<typeof placementChangeSchema>

const unplacedReasonSchema = z.enum(["N", "K", "H"])
export type UnplacedReason = z.infer<typeof unplacedReasonSchema>

const proposalLayoutSchema = z.object({
  isComplete: z.boolean(),
  rooms: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      isAvailable: z.boolean(),
      baseBeds: z.number().int(),
      extraBeds: z.number().int(),
      personIds: z.array(z.string().uuid()),
      warning: z.enum(["mixed", "overCapacity"]).nullable(),
    }),
  ),
  people: z.array(
    z.object({
      id: z.string().uuid(),
      firstName: z.string(),
      lastName: z.string(),
      value: z.string().nullable(),
      roomId: z.string().uuid().nullable(),
      savedRoomId: z.string().uuid().nullable(),
      isLocked: z.boolean(),
      reason: unplacedReasonSchema.nullable(),
      isLockConflict: z.boolean(),
      change: placementChangeSchema.nullable(),
    }),
  ),
  /** `from` and `to` are registration ids, like `people[].id`. */
  wishes: z.array(
    z.object({
      from: z.string().uuid(),
      to: z.string().uuid(),
      state: wishStateSchema,
    }),
  ),
  scores: z.object({
    placed: z.number().int(),
    crossTerm: z.number().int(),
    preferences: z.array(z.number().int()),
    moves: z.number().int(),
    extraBeds: z.number().int(),
    rooms: z.number().int(),
  }),
  summary: z.object({
    placed: z.number().int(),
    unplaced: z.number().int(),
    lockConflicts: z.number().int(),
    added: z.number().int(),
    moved: z.number().int(),
    removed: z.number().int(),
    rooms: z.number().int(),
    extraBeds: z.number().int(),
  }),
})
export type ProposalLayoutData = z.infer<typeof proposalLayoutSchema>

const storedProposalSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["solved", "timeout", "failed"]),
  triggeredBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  startedAt: z.string(),
  finishedAt: z.string(),
  layoutVersion: z.number().int(),
  isCurrent: z.boolean(),
  layout: proposalLayoutSchema.nullable(),
})
export type StoredProposalData = z.infer<typeof storedProposalSchema>

export const termRoomProposalSchema = z.object({
  mode: evaluationModeSchema,
  status: roomProposalStatusSchema,
  layoutVersion: z.number().int(),
  scheduledAt: z.string().nullable(),
  proposal: storedProposalSchema.nullable(),
  lastSolved: storedProposalSchema.nullable(),
})
export type TermRoomProposalData = z.infer<typeof termRoomProposalSchema>

/** One ranked item: "Přání", or a soft attribute with its neutral answers (#389). */
export const softPreferenceItemSchema = z.object({
  id: z.string(),
  neutralValues: z.array(z.string()).optional(),
})

export const roomProposalPreferencesSchema = z.object({
  /** Ranked, most important first; empty when the proposal skips them. */
  preferences: z.array(softPreferenceItemSchema),
  /** The id of "Přání". */
  wishes: z.string(),
  /** The categorical questions that can be ranked; never the hard attribute. */
  attributes: z.array(
    z.object({
      attribute: z.string(),
      values: z.array(z.string()),
      defaultNeutralValues: z.array(z.string()),
    }),
  ),
})

export type SoftPreferenceItem = z.infer<typeof softPreferenceItemSchema>
export type RoomProposalPreferences = z.infer<typeof roomProposalPreferencesSchema>

/** "Použít návrh" (#390, #365): what applying the proposal saved. */
export const appliedProposalSchema = z.object({
  added: z.number().int().nonnegative(),
  moved: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  /** The term's layout version after the apply; the proposal is now stale. */
  layoutVersion: z.number().int().nonnegative(),
})

export type AppliedProposal = z.infer<typeof appliedProposalSchema>

/** A person of a wish: the registration id, as in the proposal's `people[].id` and `wishes`. */
const wishPersonSchema = z.object({ registrationId: z.string().uuid(), name: z.string() })

/**
 * The usable roommate wishes of a term (#317): one-sided, between two people
 * confirmed in the term, with their state in the saved placements now (#365).
 */
export const termWishesSchema = z.object({
  wishes: z.array(
    z.object({
      from: wishPersonSchema,
      to: wishPersonSchema,
      /** In the saved placements, read live. */
      saved: wishStateSchema,
    }),
  ),
})

export type TermWishes = z.infer<typeof termWishesSchema>
