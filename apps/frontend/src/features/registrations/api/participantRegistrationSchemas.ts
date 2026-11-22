import { z } from "zod"

import { answerSchema, formQuestionSchema } from "@/features/registrations/api/questionSchemas"
import {
  genderOtherSchema,
  genderSchema,
  participationStatusSchema,
  paymentInstructionsSchema,
  receivedPaymentSchema,
  registrationNeedsSchema,
} from "@/features/registrations/api/registrationSchemas"

// The signed-in participant's own registrations (S2-14). Amounts are derived
// by the server; the client only shows them.

export const participantTermSchema = z.object({
  termId: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
  status: participationStatusSchema,
})

export const participantRegistrationSchema = z.object({
  id: z.string().uuid(),
  receivedAt: z.string(),
  event: z.object({ name: z.string(), location: z.string() }),
  /** Released terms included, so the history stays visible. */
  terms: z.array(participantTermSchema),
  selectedPriceMinor: z.number().int(),
  amountDueMinor: z.number().int(),
  paidMinor: z.number().int(),
  /** Positive a debt, zero settled, negative an overpayment. */
  balanceMinor: z.number().int(),
  /** Only while a debt remains. */
  paymentInstructions: paymentInstructionsSchema.nullable(),
  /** Token of the QR payment link; only while a debt remains. */
  paymentLinkToken: z.string().nullable(),
  payments: z.array(receivedPaymentSchema),
  /** The e-mail is the sign-in identity and cannot be changed. */
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    /** Voluntary answer for accommodation; null when not answered. */
    gender: genderSchema.nullable(),
    genderOther: genderOtherSchema,
  }),
  /** Sent back as `expectedVersion` when changing the registration. */
  version: z.number().int(),
  /** Transport, diet and health (F63). */
  needs: registrationNeedsSchema,
  /** Every term released. */
  isCancelled: z.boolean(),
  /** Editing and cancelling are offered: not cancelled, no request waiting. */
  canChange: z.boolean(),
})

/** A term of the event the registration could move to. */
export const availableTermSchema = z.object({
  termId: z.string().uuid(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  priceMinor: z.number().int(),
})

export const participantRegistrationDetailSchema = participantRegistrationSchema.extend({
  availableTerms: z.array(availableTermSchema),
  /** The organizer's categorical questions (#485), in form order. */
  questions: z.array(formQuestionSchema),
  /** The version of those questions; a change sends it back (#485). */
  questionsVersion: z.string(),
  /** The answers given; a question without one is not answered. */
  answers: z.array(answerSchema),
  /** Required questions without an answer: a change must answer them first. */
  missingAnswers: z.array(z.string().uuid()),
})

export const participantRegistrationListSchema = z.object({
  registrations: z.array(participantRegistrationSchema),
})

export type ParticipantTerm = z.infer<typeof participantTermSchema>
export type ParticipantRegistration = z.infer<typeof participantRegistrationSchema>
export type ParticipantRegistrationDetail = z.infer<typeof participantRegistrationDetailSchema>
export type AvailableTerm = z.infer<typeof availableTermSchema>
