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

import { capacityConflictMessage } from "@/features/rooms/components/CapacityConflictAlert"

type DeleteRoomCapacityDialogProps = {
  isOpen: boolean
  label: string
  /** Terms the deletion would drop below their confirmed participants. */
  conflictTerms?: string
}

// Deleting a room (F11-1). When a term would drop below its confirmed
// participants, there is nothing to confirm: the dialog only says why the
// room can't be deleted. Design only: the affected terms are passed in.
export function DeleteRoomCapacityDialog({
  isOpen,
  label,
  conflictTerms,
}: DeleteRoomCapacityDialogProps) {
  if (conflictTerms) {
    return (
      <Dialog open={isOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pokoj „{label}“ nelze odstranit</DialogTitle>
            <DialogDescription>{capacityConflictMessage(conflictTerms)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Zavřít</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odstranit pokoj „{label}“?</DialogTitle>
          <DialogDescription>
            Pokoj se z akce trvale odstraní a kapacita termínů, ve kterých byl dostupný, se sníží.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zrušit</Button>
          </DialogClose>
          <Button variant="destructive">Odstranit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
