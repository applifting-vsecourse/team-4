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

import { type Room } from "@/features/rooms/api/roomSchemas"
import { useDeleteRoom, useRefreshRooms } from "@/features/rooms/hooks/useRoomMutations"
import { describeRoomError } from "@/features/rooms/lib/roomErrors"

type DeleteRoomDialogProps = {
  organizationId: string
  eventId: string
  room: Room
  onChanged: () => unknown
  trigger: ReactNode
}

export function DeleteRoomDialog({
  organizationId,
  eventId,
  room,
  onChanged,
  trigger,
}: DeleteRoomDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const deleteRoom = useDeleteRoom(organizationId, eventId, onChanged)
  const refreshRooms = useRefreshRooms(organizationId, eventId)

  const handleOpenChange = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    setErrorMessage(null)
  }

  const handleDelete = async () => {
    setErrorMessage(null)
    try {
      await deleteRoom.mutateAsync(room.id)
      setIsOpen(false)
      toast.success("Pokoj byl odstraněn.")
    } catch (error) {
      const described = describeRoomError(
        error,
        "Pokoj se nepodařilo odstranit. Zkuste to prosím znovu.",
      )
      setErrorMessage(described.errorMessage)
      if (described.shouldRefresh) await refreshRooms()
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
          <DialogTitle>Odstranit pokoj „{room.label}“?</DialogTitle>
          <DialogDescription>
            Pokoj se z akce trvale odstraní a kapacita termínů, ve kterých byl dostupný, se sníží.
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
            disabled={deleteRoom.isPending}
            onClick={handleDelete}
          >
            {deleteRoom.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Odstranit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
