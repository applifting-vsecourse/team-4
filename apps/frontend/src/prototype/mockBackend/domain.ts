import { type OpeningBlocker } from "@/features/events/api/eventSchemas"
import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"
import { type PaymentState } from "@/features/registrations/api/eventRegistrationSchemas"
import { type ParticipationStatus } from "@/features/registrations/api/registrationSchemas"

// Business rules of apps/backend, restated for the mock backend so a preview
// behaves like the server: what blocks opening, how a term decides between a
// bed and the waitlist, how payments add up. Keep them in step with the
// backend domain files named in each comment.

/** modules/events/domain/payment-settings.ts: ČNB mod-11 weights from the right. */
const WEIGHTS = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6]

const hasValidChecksum = (digits: string) => {
  let sum = 0
  for (let index = 0; index < digits.length; index++) {
    sum += Number(digits[index]) * (WEIGHTS[digits.length - 1 - index] ?? 0)
  }
  return sum % 11 === 0
}

export function findInvalidAccountField(prefix: string | null, number: string) {
  if (prefix !== null && !hasValidChecksum(prefix)) return "bankAccountPrefix" as const
  if (number.replace(/0/g, "").length < 2 || !hasValidChecksum(number)) {
    return "bankAccountNumber" as const
  }
  return null
}

/** modules/events/domain/event.ts: rooms and free beds are not preconditions. */
export function findOpeningBlockers(event: {
  name: string
  description: string
  location: string
  termCount: number
  paymentSettings: PaymentSettings | null
}): OpeningBlocker[] {
  const blockers: OpeningBlocker[] = []
  if (event.name.trim() === "") blockers.push("name")
  if (event.description.trim() === "") blockers.push("description")
  if (event.location.trim() === "") blockers.push("location")
  if (event.termCount < 1) blockers.push("terms")
  const payment = event.paymentSettings
  if (
    !payment ||
    payment.paymentReminderDays < 1 ||
    findInvalidAccountField(payment.bankAccountPrefix, payment.bankAccountNumber)
  ) {
    blockers.push("paymentSettings")
  }
  return blockers
}

/** modules/events/domain/calendar-date.ts: both days belong to a term. */
export const rangesOverlap = (
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
) => a.startDate <= b.endDate && b.startDate <= a.endDate

/** modules/registrations/domain/registration.ts: one registration per e-mail and event. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** A free bed at the moment of saving confirms; a full or bed-less term waitlists (S2-08). */
export const decideParticipation = (term: {
  capacity: number
  confirmed: number
}): ParticipationStatus => (term.confirmed < term.capacity ? "confirmed" : "waitlisted")

/** modules/registrations/domain/managed-registration.ts (data-model.md §3.9). */
export function paymentState(dueMinor: number, paidMinor: number): PaymentState {
  if (paidMinor > dueMinor) return "overpaid"
  if (dueMinor === 0) return "none"
  if (paidMinor === 0) return "unpaid"
  return paidMinor < dueMinor ? "partial" : "paid"
}

/** Σ confirmed terms; waitlisted terms owe nothing. */
export const amountDueMinor = (terms: { status: ParticipationStatus; priceMinor: number }[]) =>
  terms.filter((term) => term.status === "confirmed").reduce((sum, t) => sum + t.priceMinor, 0)

/**
 * The payment reminder, `days` calendar days after receipt. The backend keeps
 * the Prague wall-clock time across a DST change; a preview does not need that.
 */
export function paymentReminderAt(receivedAt: string, days: number) {
  const reminder = new Date(receivedAt)
  reminder.setUTCDate(reminder.getUTCDate() + days)
  return reminder.toISOString()
}

export const MAX_PAYMENT_MINOR = 1_000_000_000

/** 15 minutes, single use (S2-13). */
export const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000
