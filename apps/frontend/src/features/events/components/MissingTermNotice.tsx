import { Lock } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

import { type EventDetail } from "@/features/events/api/eventSchemas"

type MissingTermNoticeProps = {
  event: EventDetail
}

// Keep the explanation for the exceptional locked event without terms (S2-17).
// Draft events show their missing-term action in the opening-readiness checklist.
export function MissingTermNotice({ event }: MissingTermNoticeProps) {
  if (event.terms.length > 0 || !event.isLocked) return null

  return (
    <Alert className="mb-6">
      <Lock />
      <AlertDescription>
        <div className="grid gap-1">
          <p>Tato akce zatím nemá žádný termín.</p>
          <p>Od otevření přihlašování jsou termíny zamčené, nový termín už nelze přidat.</p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
