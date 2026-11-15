import { Badge } from "@/components/ui/badge"
import { PARTICIPATION_LABELS, type TermParticipation } from "@/lib/participation"

const BADGE_VARIANTS = {
  pending: "secondary",
  confirmed: "success",
  waitlisted: "warning",
  cancelled: "secondary",
} as const satisfies Record<TermParticipation, string>

// One term's own state; a registration can be confirmed in one term and
// waiting in another (DESIGN.md status colours).
export function ParticipationBadge({ status }: { status: TermParticipation }) {
  return <Badge variant={BADGE_VARIANTS[status]}>{PARTICIPATION_LABELS[status]}</Badge>
}
