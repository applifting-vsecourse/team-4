import { Loader2 } from "lucide-react"

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
} from "@/components/ui/dialog"

export type DeleteProgrammeItemDialogProps = {
  isOpen: boolean
  itemTitle: string
  /** The deletion failed; the item stays in the programme. */
  errorMessage?: string
  isSubmitting?: boolean
}

// Confirmation of deleting a programme item (F65), organizer. Design only.
export function DeleteProgrammeItemDialog({
  isOpen,
  itemTitle,
  errorMessage,
  isSubmitting = false,
}: DeleteProgrammeItemDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smazat položku „{itemTitle}“?</DialogTitle>
          <DialogDescription>
            Položka zmizí z programu termínu i u potvrzených účastníků.
          </DialogDescription>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Smazat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
