/**
 * The state of one term of a registration: "pending" waits for the organizer's
 * decision (S3-01), "cancelled" is a term the participant released (F35-2a).
 */
export const TERM_PARTICIPATIONS = ["pending", "confirmed", "waitlisted", "cancelled"] as const

export type TermParticipation = (typeof TERM_PARTICIPATIONS)[number]

export const PARTICIPATION_LABELS: Record<TermParticipation, string> = {
  pending: "Čeká na rozhodnutí organizátora",
  confirmed: "Potvrzeno",
  waitlisted: "Náhradník",
  cancelled: "Odhlášeno",
}
