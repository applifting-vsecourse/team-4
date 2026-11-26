import { type ParticipantTerm } from "@/features/registrations/api/participantRegistrationSchemas"

// What a participant is told about money (S5-02). Only confirmed terms create
// a payment obligation; the price of waiting or waitlisted terms is never
// presented as something to pay. The e-mails apply the same rule.
export type PaymentOverview =
  /** Every term released; money already paid is an overpayment. */
  | { kind: "cancelled"; overpaidMinor: number }
  /** Nothing confirmed yet: the price is preliminary and nothing is to be paid. */
  | { kind: "preliminary"; priceMinor: number; overpaidMinor: number }
  | {
      kind: "confirmed"
      dueMinor: number
      paidMinor: number
      /** A debt, never negative. */
      remainingMinor: number
      overpaidMinor: number
    }

export function paymentOverview(input: {
  terms: Pick<ParticipantTerm, "status">[]
  selectedPriceMinor: number
  amountDueMinor: number
  paidMinor: number
}): PaymentOverview {
  const balance = input.amountDueMinor - input.paidMinor
  const overpaidMinor = Math.max(-balance, 0)
  const selected = input.terms.filter((term) => term.status !== "cancelled")

  if (selected.length === 0) return { kind: "cancelled", overpaidMinor }
  if (!selected.some((term) => term.status === "confirmed")) {
    return { kind: "preliminary", priceMinor: input.selectedPriceMinor, overpaidMinor }
  }
  return {
    kind: "confirmed",
    dueMinor: input.amountDueMinor,
    paidMinor: input.paidMinor,
    remainingMinor: Math.max(balance, 0),
    overpaidMinor,
  }
}
