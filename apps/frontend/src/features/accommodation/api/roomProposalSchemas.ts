import { z } from "zod"

import { evaluationModeSchema } from "@/features/accommodation/api/evaluationSchemas"

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
  wishes: z.array(
    z.object({
      from: z.string().uuid(),
      to: z.string().uuid(),
      state: z.enum(["satisfied", "unsatisfied", "unplaced", "impossible"]),
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
