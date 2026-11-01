import { useState } from "react"
import { toast } from "sonner"

import { readApiError } from "@/lib/apiError"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { PublicationSection } from "@/features/events/components/PublicationSection"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useSetPublication } from "@/features/events/hooks/useSetPublication"

type EventPublicationProps = {
  organizationId: string
  event: EventDetail
}

// Connects the publication card to the API (F54-1). Independent of the
// registration status, so it stays available after registration was opened.
export function EventPublication({ organizationId, event }: EventPublicationProps) {
  const setPublication = useSetPublication(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleChange = async (isPublished: boolean) => {
    setErrorMessage(null)
    try {
      await setPublication.mutateAsync(isPublished)
      toast.success(
        isPublished ? "Akce je zveřejněná v katalogu." : "Akce byla z katalogu stažena.",
      )
    } catch (error) {
      if (readApiError(error).status === 404) {
        await refreshEvent()
        setErrorMessage("Záznam není dostupný.")
      } else {
        setErrorMessage("Změnu publikace se nepodařilo uložit. Zkuste to prosím znovu.")
      }
    }
  }

  return (
    <PublicationSection
      isPublished={event.isPublished}
      isPending={setPublication.isPending}
      errorMessage={errorMessage}
      onChange={handleChange}
    />
  )
}
