import { useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
      const described = await describeTermError(
        error,
        "Termín se nepodařilo odstranit. Zkuste to prosím znovu.",
      )
      setErrorMessage(described.errorMessage ?? described.fieldError?.message ?? null)
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
          <DialogTitle>Odstranit termín „{term.label}“?</DialogTitle>
          <DialogDescription>Termín se z akce trvale odstraní.</DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zrušit</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={deleteTerm.isPending}
            onClick={handleDelete}
          >
            {deleteTerm.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Odstranit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
