import { Badge } from "@/components/ui/badge"

import { type ParticipationStatus } from "@/features/registrations/api/registrationSchemas"

export const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  pending: "Čeká na rozhodnutí organizátora",
  confirmed: "Potvrzeno",
  waitlisted: "Náhradník",
  cancelled: "Odhlášeno",
}

const BADGE_VARIANTS = {
  pending: "secondary",
  confirmed: "success",
  waitlisted: "warning",
  cancelled: "secondary",
} as const

// One term's own status; a registration can be confirmed in one term and
// waiting in another (DESIGN.md status colours).
export function ParticipationBadge({ status }: { status: ParticipationStatus }) {
  return <Badge variant={BADGE_VARIANTS[status]}>{PARTICIPATION_LABELS[status]}</Badge>
}
