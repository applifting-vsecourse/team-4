import { type RegistrationSummary } from "@/features/registrations/api/eventRegistrationSchemas"

export type OverviewTerm = { id: string; label: string; capacity: number }

export type TermOccupancy = {
  term: OverviewTerm
  confirmed: number
  waitlisted: number
}

export type OverviewSummary = {
  registrationCount: number
  terms: TermOccupancy[]
  confirmedTotal: number
  capacityTotal: number
  waitlistedTotal: number
  amountDueMinor: number
  paidMinor: number
  paidCount: number
  partialCount: number
  unpaidCount: number
}

// Derives the event overview from the event's registrations. Amounts come
// from the server per registration; this only adds them up.
export function summarizeEvent(
  registrations: RegistrationSummary[],
  terms: OverviewTerm[],
): OverviewSummary {
  const occupancy = terms.map((term) => {
    const states = registrations.flatMap((registration) =>
      registration.terms.filter((entry) => entry.termId === term.id).map((entry) => entry.status),
    )
    return {
      term,
      confirmed: states.filter((status) => status === "confirmed").length,
      waitlisted: states.filter((status) => status === "waitlisted").length,
    }
  })
  const countState = (state: RegistrationSummary["paymentState"]) =>
    registrations.filter((registration) => registration.paymentState === state).length

  return {
    registrationCount: registrations.length,
    terms: occupancy,
    confirmedTotal: occupancy.reduce((sum, entry) => sum + entry.confirmed, 0),
    capacityTotal: terms.reduce((sum, term) => sum + term.capacity, 0),
    waitlistedTotal: occupancy.reduce((sum, entry) => sum + entry.waitlisted, 0),
    amountDueMinor: registrations.reduce(
      (sum, registration) => sum + registration.amountDueMinor,
      0,
    ),
    paidMinor: registrations.reduce((sum, registration) => sum + registration.paidMinor, 0),
    paidCount: countState("paid") + countState("overpaid"),
    partialCount: countState("partial"),
    unpaidCount: countState("unpaid"),
  }
}
