import { z } from "zod"

import {
  genderOtherSchema,
  genderSchema,
  participationStatusSchema,
  type Gender,
} from "@/features/registrations/api/registrationSchemas"

// Participant changes of an own registration and the organizer's approval
// (F35-2a). Amounts and outcomes are worked out by the server; the client only
// shows them and sends back what the participant confirmed.

export const changeKindSchema = z.enum(["data", "move", "cancel_terms", "cancel_all"])

export type ChangeKind = z.infer<typeof changeKindSchema>

export const changeStatusSchema = z.enum(["pending", "applied", "approved", "rejected"])

export type ChangeStatus = z.infer<typeof changeStatusSchema>

const plannedTermSchema = z.object({
  termId: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
  /** Null where the term is not part of the registration. */
  original: participationStatusSchema.nullable(),
  proposed: participationStatusSchema.nullable(),
})

const moneySchema = z.object({
  /** Σ confirmed terms. */
  dueMinor: z.number().int(),
  paidMinor: z.number().int(),
  /** Due − paid: positive a debt, negative an overpayment. */
  balanceMinor: z.number().int(),
})

export const changeSummarySchema = z.object({
  values: z.array(
    z.discriminatedUnion("field", [
      z.object({
        field: z.enum(["firstName", "lastName", "phone"]),
        original: z.string(),
        proposed: z.string(),
      }),
      // F64: null is "not answered".
      z.object({
        field: z.literal("gender"),
        original: genderSchema.nullable(),
        proposed: genderSchema.nullable(),
      }),
      // Null is no own words for "Jiná odpověď".
      z.object({
        field: z.literal("genderOther"),
        original: genderOtherSchema,
        proposed: genderOtherSchema,
      }),
    ]),
  ),
  terms: z.array(plannedTermSchema),
  original: moneySchema,
  proposed: moneySchema,
})

export type ChangeSummaryData = z.infer<typeof changeSummarySchema>

export const changePreviewSchema = z.object({
  /** Sent back as `expectedVersion`. */
  version: z.number().int(),
  /** Sent back as `expectsApproval`. */
  requiresApproval: z.boolean(),
  kinds: z.array(changeKindSchema),
  moves: z.array(
    z.object({
      fromTermId: z.string().uuid(),
      toTermId: z.string().uuid(),
      resultStatus: participationStatusSchema,
      requiresWaitlistConsent: z.boolean(),
    }),
  ),
  summary: changeSummarySchema,
})

export type ChangePreview = z.infer<typeof changePreviewSchema>

export const registrationChangeSchema = z.object({
  id: z.string().uuid(),
  registrationId: z.string().uuid(),
  status: changeStatusSchema,
  kinds: z.array(changeKindSchema),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  summary: changeSummarySchema,
  /** Waiting, and a move now ends on the waitlist without the participant's consent. */
  needsParticipantConsent: z.boolean(),
  /** Waiting, and the registration changed after the proposal was made. */
  isStale: z.boolean(),
  participant: z.object({ firstName: z.string(), lastName: z.string(), email: z.string() }),
})

export type RegistrationChange = z.infer<typeof registrationChangeSchema>

export const registrationChangeListSchema = z.object({
  changes: z.array(registrationChangeSchema),
})

export const submittedChangeSchema = z.object({
  outcome: z.enum(["applied", "requested"]),
  change: registrationChangeSchema,
})

/** What the participant proposes; a field left out stays as it is. */
export type ChangeProposal = {
  firstName?: string
  lastName?: string
  phone?: string
  /** Null clears the answer back to "not answered". */
  gender?: Gender | null
  /** Own words for `other`; null removes them. */
  genderOther?: string | null
  moves: { fromTermId: string; toTermId: string; acceptWaitlist: boolean }[]
  cancelledTermIds: string[]
}

export type SubmitChangeInput = ChangeProposal & {
  expectedVersion: number
  expectsApproval: boolean
}
