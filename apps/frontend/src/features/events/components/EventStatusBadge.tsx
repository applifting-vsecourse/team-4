import { Badge } from "@/components/ui/badge"

import { type EventStatus } from "@/features/events/api/eventSchemas"

const LABELS: Record<EventStatus, string> = {
  draft: "Koncept",
  open: "Přihlašování otevřeno",
  closed: "Přihlašování zavřeno",
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge variant="secondary">{LABELS[status]}</Badge>
}
