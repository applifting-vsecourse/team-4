import { CalendarPlus, Lock } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { TermDialog } from "@/features/events/components/TermDialog"

type MissingTermNoticeProps = {
  organizationId: string
  event: EventDetail
}

// Next step for an event without terms (S2-17). A locked event cannot get a
// term any more (S2-04), so it explains the lock instead of offering the add.
export function MissingTermNotice({ organizationId, event }: MissingTermNoticeProps) {
  if (event.terms.length > 0) return null

  return (
    <Alert className={event.isLocked ? "mb-6" : "mb-6 items-center [&>svg]:translate-y-0"}>
      {event.isLocked ? <Lock /> : <CalendarPlus />}
      <AlertDescription>
        <div
          className={
            event.isLocked ? "grid gap-1" : "flex w-full items-center justify-between gap-4"
          }
        >
          <p>Tato akce zatím nemá žádný termín.</p>
          {event.isLocked ? (
            <p>Od otevření přihlašování jsou termíny zamčené, nový termín už nelze přidat.</p>
          ) : (
            <TermDialog
              organizationId={organizationId}
              eventId={event.id}
              trigger={
                <Button
                  size="sm"
                  className="shrink-0"
                >
                  Přidat termín
                </Button>
              }
            />
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
