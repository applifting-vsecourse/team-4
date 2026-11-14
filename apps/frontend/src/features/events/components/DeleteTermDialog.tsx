import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"

import { type EventTerm } from "@/features/events/api/eventSchemas"
import { useDeleteTerm, useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { describeTermError } from "@/features/events/lib/termErrors"

type DeleteTermDialogProps = {
  organizationId: string
  eventId: string
  term: EventTerm
  trigger: ReactNode
}

export function DeleteTermDialog({
  organizationId,
  eventId,
  term,
  trigger,
}: DeleteTermDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const deleteTerm = useDeleteTerm(organizationId, eventId)
  const refreshEvent = useRefreshEvent(organizationId, eventId)

  const handleOpenChange = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    setErrorMessage(null)
  }

  const handleDelete = async () => {
    setErrorMessage(null)
    try {
      await deleteTerm.mutateAsync(term.id)
      setIsOpen(false)
      toast.success("Termín byl odstraněn.")
    } catch (error) {
      const described = describeTermError(
        error,
        "Termín se nepodařilo odstranit. Zkuste to prosím znovu.",
      )
      setErrorMessage(described.errorMessage ?? described.fieldError?.message ?? null)
      if (described.shouldRefresh) await refreshEvent()
    }
  }

  return (
    <ConfirmDeleteDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={`Odstranit termín „${term.label}“?`}
      consequence="Termín se z akce trvale odstraní."
      errorMessage={errorMessage}
      isDeleting={deleteTerm.isPending}
      onConfirm={handleDelete}
    />
  )
}
