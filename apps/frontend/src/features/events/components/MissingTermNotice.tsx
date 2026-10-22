import { Link } from "@tanstack/react-router"
import { CalendarPlus, Lock } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { type EventDetail } from "@/features/events/api/eventSchemas"

type MissingTermNoticeProps = {
  organizationId: string
  event: EventDetail
}

// Next step for an event without terms (S2-17). A locked event cannot get a
// term any more (S2-04), so it explains the lock instead of offering the add.
export function MissingTermNotice({ organizationId, event }: MissingTermNoticeProps) {
  if (event.terms.length > 0) return null

  return (
    <Alert className="mb-6">
      {event.isLocked ? <Lock /> : <CalendarPlus />}
      <AlertDescription>
        <p>Tato akce zatím nemá žádný termín.</p>
        {event.isLocked ? (
          <p>Od otevření přihlašování jsou termíny zamčené, nový termín už nelze přidat.</p>
        ) : (
          <Button
            asChild
            size="sm"
            className="mt-2"
          >
            <Link
              to={ROUTES.eventSettings}
              params={{ organizationId, eventId: event.id }}
              hash="terms-heading"
            >
              Přidat termín
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
