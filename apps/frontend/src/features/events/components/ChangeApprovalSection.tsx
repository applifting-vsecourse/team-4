import { useState } from "react"
import { toast } from "sonner"

import { readApiError } from "@/lib/apiError"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { ChangeApprovalSettings } from "@/features/events/components/ChangeApprovalSettings"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useUpdateChangeApproval } from "@/features/events/hooks/useUpdateChangeApproval"
import {
  CHANGE_APPROVAL_INVALID,
  describeApprovalSetting,
  parseApprovalDays,
} from "@/features/events/lib/changeApproval"

type ChangeApprovalSectionProps = {
  organizationId: string
  event: EventDetail
}

// Block of the Přihlašování card (F35-1a). Stays editable after registration
// has been opened. A failed save keeps the saved setting and the entered text.
export function ChangeApprovalSection({ organizationId, event }: ChangeApprovalSectionProps) {
  const update = useUpdateChangeApproval(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const [daysError, setDaysError] = useState<string | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  const handleSubmit = async (text: string) => {
    setDaysError(undefined)
    setErrorMessage(undefined)
    const parsed = parseApprovalDays(text)
    if (!parsed.ok) {
      setDaysError(parsed.message)
      return
    }
    try {
      await update.mutateAsync(parsed.days)
      toast.success("Schvalování změn bylo uloženo.")
    } catch (error) {
      const apiError = readApiError(error)
      if (apiError.status === 400 && apiError.field === "days") {
        setDaysError(apiError.message ?? CHANGE_APPROVAL_INVALID)
      } else if (apiError.status === 404) {
        await refreshEvent()
        setErrorMessage("Záznam není dostupný.")
      } else {
        setErrorMessage("Schvalování změn se nepodařilo uložit. Zkuste to prosím znovu.")
      }
    }
  }

  return (
    <ChangeApprovalSettings
      savedSetting={describeApprovalSetting(event.changeApprovalDays)}
      days={event.changeApprovalDays === null ? "" : String(event.changeApprovalDays)}
      daysError={daysError}
      errorMessage={errorMessage}
      isSaving={update.isPending}
      onSubmit={handleSubmit}
      onDismissError={() => setErrorMessage(undefined)}
    />
  )
}
