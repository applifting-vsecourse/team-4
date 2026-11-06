import { z } from "zod"

// The term evaluation API of S3-01 (Přihlášky → Vyhodnocení, Nastavení →
// Automatizace). Answers and values of the hard attribute are the API's
// codes, e.g. `female`; labels come from the client.

export const evaluationModeSchema = z.enum(["automatic", "manual"])
export type EvaluationMode = z.infer<typeof evaluationModeSchema>

export const evaluationModeResponseSchema = z.object({ mode: evaluationModeSchema })

export const evaluationStatusSchema = z.enum([
  "none",
  "running",
  "current",
  "stale",
  "failed",
  "timeout",
  "infeasible",
])

const reasonSchema = z.enum(["A", "B", "C", "N", "R"])
const resultSchema = z.enum(["suitable", "unsuitable", "manual"])

export const hardAttributeSchema = z.object({
  attribute: z.string(),
  nonDeterminingValues: z.array(z.string()),
  determiningValues: z.array(z.string()),
})

export const termEvaluationSchema = z.object({
  mode: evaluationModeSchema,
  term: z.object({
    id: z.string().uuid(),
    label: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  hardAttribute: hardAttributeSchema.nullable(),
  hasRooms: z.boolean(),
  status: evaluationStatusSchema,
  inputVersion: z.number().int(),
  scheduledAt: z.string().nullable(),
  proposalRun: z
    .object({ id: z.string().uuid(), finishedAt: z.string(), isCurrent: z.boolean() })
    .nullable(),
  conflict: z
    .object({
      constraint: z.enum(["capacity", "homogeneity"]),
      confirmed: z.array(
        z.object({
          registrationId: z.string().uuid(),
          firstName: z.string(),
          lastName: z.string(),
        }),
      ),
    })
    .nullable(),
  capacity: z.object({
    baseBeds: z.number().int(),
    extraBeds: z.number().int(),
    confirmed: z.number().int(),
    pending: z.number().int(),
    waitlisted: z.number().int(),
    proposal: z
      .object({
        suitable: z.number().int(),
        unsuitable: z.number().int(),
        manual: z.number().int(),
        baseUsed: z.number().int(),
        extraUsed: z.number().int(),
      })
      .optional(),
  }),
  queues: z.array(
    z.object({
      value: z.string().nullable(),
      pending: z.number().int(),
      waitlisted: z.number().int(),
      suitable: z.number().int().optional(),
      unsuitable: z.number().int().optional(),
    }),
  ),
  manualCount: z.number().int(),
  order: z.array(
    z.object({
      registrationId: z.string().uuid(),
      firstName: z.string(),
      lastName: z.string(),
      receivedAt: z.string(),
      status: z.enum(["pending", "waitlisted"]),
      position: z.number().int(),
      answer: z.string().nullable(),
      determinedValue: z.string().nullable(),
      effectiveValue: z.string().nullable(),
      result: resultSchema.optional(),
      reason: reasonSchema.optional(),
    }),
  ),
})

export type TermEvaluationData = z.infer<typeof termEvaluationSchema>

const runStatusSchema = z.enum(["solved", "infeasible", "timeout", "failed"])

export const runListItemSchema = z.object({
  id: z.string().uuid(),
  status: runStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string(),
  triggeredBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  inputVersion: z.number().int(),
  isCurrent: z.boolean(),
  summary: z
    .object({
      suitable: z.number().int(),
      unsuitable: z.number().int(),
      manual: z.number().int(),
    })
    .nullable(),
})

export type RunListItem = z.infer<typeof runListItemSchema>

export const runListSchema = z.object({ runs: z.array(runListItemSchema) })

const evidencePersonSchema = z.object({
  registrationId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  receivedAt: z.string(),
  answer: z.string().nullable(),
  manualValue: z.string().nullable(),
  effectiveValue: z.string().nullable(),
  position: z.number().int().optional(),
  result: resultSchema.optional(),
  reason: reasonSchema.optional(),
})

export const runEvidenceSchema = runListItemSchema.extend({
  termId: z.string().uuid(),
  termLabel: z.string(),
  solverVersion: z.string(),
  hardAttribute: hardAttributeSchema.nullable(),
  rooms: z.array(
    z.object({
      roomId: z.string().uuid(),
      label: z.string(),
      baseBeds: z.number().int(),
      extraBeds: z.number().int(),
    }),
  ),
  confirmed: z.array(evidencePersonSchema),
  isOrderManual: z.boolean(),
  order: z.array(evidencePersonSchema),
  conflict: z
    .object({
      constraint: z.enum(["capacity", "homogeneity"]),
      confirmed: z.array(
        z.object({
          registrationId: z.string().uuid(),
          firstName: z.string(),
          lastName: z.string(),
        }),
      ),
    })
    .optional(),
  error: z.string().nullable(),
})

export type RunEvidence = z.infer<typeof runEvidenceSchema>
