import { Badge } from "@/components/ui/badge"

import { type ParticipationStatus } from "@/features/registrations/api/registrationSchemas"

export const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  confirmed: "Potvrzeno",
  waitlisted: "Náhradník",
}

// One term's own status; a registration can be confirmed in one term and
// waiting in another (DESIGN.md status colours).
export function ParticipationBadge({ status }: { status: ParticipationStatus }) {
  return (
    <Badge variant={status === "confirmed" ? "success" : "warning"}>
      {PARTICIPATION_LABELS[status]}
    </Badge>
  )
}
