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
  CapacityConflictAlert,
  type CapacityConflict,
} from "@/features/rooms/components/CapacityConflictAlert"

type DeleteRoomCapacityDialogProps = {
  isOpen: boolean
  label: string
  conflicts?: CapacityConflict[]
}

// Deleting a room (F11-1); refused when a term would drop below its confirmed
// participants. Design only: the conflicts are passed in.
export function DeleteRoomCapacityDialog({
  isOpen,
  label,
  conflicts = [],
}: DeleteRoomCapacityDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odstranit pokoj „{label}“?</DialogTitle>
          <DialogDescription>
            Pokoj se z akce trvale odstraní a kapacita termínů, ve kterých byl dostupný, se sníží.
          </DialogDescription>
        </DialogHeader>
        {conflicts.length > 0 ? <CapacityConflictAlert conflicts={conflicts} /> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zrušit</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={conflicts.length > 0}
          >
            Odstranit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
