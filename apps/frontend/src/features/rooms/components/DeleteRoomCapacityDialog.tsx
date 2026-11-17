import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
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

import {
  capacityConflictMessage,
  type CapacityConflict,
} from "@/features/rooms/components/CapacityConflictAlert"

type DeleteRoomCapacityDialogProps = {
  isOpen: boolean
  label: string
  /** Terms the deletion would drop below their confirmed participants. */
  conflicts?: CapacityConflict[]
  errorMessage?: string
  isDeleting?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onConfirm?: () => void
}

// Deleting a room (F11-1). When a term would drop below its confirmed
// participants, there is nothing to confirm: the dialog only says why the
// room can't be deleted.
export function DeleteRoomCapacityDialog({
  isOpen,
  label,
  conflicts,
  errorMessage,
  isDeleting = false,
  onOpenChange,
  onConfirm,
}: DeleteRoomCapacityDialogProps) {
  if (conflicts?.length) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pokoj „{label}“ nelze odstranit</DialogTitle>
            <DialogDescription>{capacityConflictMessage(conflicts)}</DialogDescription>
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
    <ConfirmDeleteDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={`Odstranit pokoj „${label}“?`}
      consequence="Pokoj se z akce trvale odstraní a kapacita termínů, ve kterých byl dostupný, se sníží."
      errorMessage={errorMessage}
      isDeleting={isDeleting}
      onConfirm={onConfirm}
    />
  )
}
