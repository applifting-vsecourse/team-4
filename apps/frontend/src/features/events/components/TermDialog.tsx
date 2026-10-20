import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { minorToInput } from "@/lib/money"

import { type EventTerm, type TermInput } from "@/features/events/api/eventSchemas"
import { TermForm, type TermFormValues } from "@/features/events/components/TermForm"
import { useRefreshEvent, useSaveTerm } from "@/features/events/hooks/useEventMutations"
import { describeTermError, type TermSaveError } from "@/features/events/lib/termErrors"

const NEW_TERM: TermFormValues = { label: "", startDate: "", endDate: "", price: "" }

type TermDialogProps = {
  organizationId: string
  eventId: string
  /** The term to edit; without it the dialog adds a new one. */
  term?: EventTerm
  trigger: ReactNode
}

// "Zrušit" and closing discard the changes: the form is mounted only while
// the dialog is open, so it starts from the saved values every time.
export function TermDialog({ organizationId, eventId, term, trigger }: TermDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [failure, setFailure] = useState<TermSaveError | null>(null)
  const saveTerm = useSaveTerm(organizationId, eventId)
  const refreshEvent = useRefreshEvent(organizationId, eventId)

  const initialValues: TermFormValues = term
    ? {
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
        price: minorToInput(term.priceMinor),
      }
    : NEW_TERM

  const handleOpenChange = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    setFailure(null)
  }

  const handleSubmit = async (input: TermInput) => {
    setFailure(null)
    try {
      await saveTerm.mutateAsync({ termId: term?.id, input })
      setIsOpen(false)
      toast.success(term ? "Termín byl upraven." : "Termín byl přidán.")
    } catch (error) {
      const described = describeTermError(
        error,
        "Termín se nepodařilo uložit. Zkuste to prosím znovu.",
      )
      setFailure(described)
      if (described.shouldRefresh) await refreshEvent()
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{term ? "Upravit termín" : "Nový termín"}</DialogTitle>
          <DialogDescription className="sr-only">
            Označení, začátek, konec a cena termínu.
          </DialogDescription>
        </DialogHeader>
        <TermForm
          initialValues={initialValues}
          isLoading={saveTerm.isPending}
          errorMessage={failure?.errorMessage}
          fieldError={failure?.fieldError}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
