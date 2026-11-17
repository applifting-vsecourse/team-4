import { Lock } from "lucide-react"

import { Notice } from "@/components/Notice"

import { type EventDetail } from "@/features/events/api/eventSchemas"

type MissingTermNoticeProps = {
  event: EventDetail
}

// Keep the explanation for the exceptional locked event without terms (S2-17).
// Draft events show their missing-term action in the opening-readiness checklist.
export function MissingTermNotice({ event }: MissingTermNoticeProps) {
  if (event.terms.length > 0 || !event.isLocked) return null

  return (
    <div className="mb-6">
      <Notice
        tone="info"
        icon={Lock}
        title="Tato akce zatím nemá žádný termín."
      >
        Od otevření přihlašování jsou termíny zamčené, nový termín už nelze přidat.
      </Notice>
    </div>
  )
}
