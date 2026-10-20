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

import { type Room, type RoomInput, type TermCapacity } from "@/features/rooms/api/roomSchemas"
import { RoomForm, type RoomFormValues } from "@/features/rooms/components/RoomForm"
import { useRefreshRooms, useSaveRoom } from "@/features/rooms/hooks/useRoomMutations"
import { describeRoomError, type RoomSaveError } from "@/features/rooms/lib/roomErrors"

const NEW_ROOM: RoomFormValues = { label: "", bedCount: "", termIds: [] }

type RoomDialogProps = {
  organizationId: string
  eventId: string
  terms: TermCapacity[]
  /** The room to edit; without it the dialog adds a new one. */
  room?: Room
  /** Called after a saved change, e.g. to reload the capacity shown elsewhere. */
  onChanged: () => unknown
  trigger: ReactNode
}

// "Zrušit" and closing discard the changes: the form is mounted only while
// the dialog is open, so it starts from the saved values every time. After a
// failed save the dialog stays open with the entered values for a retry.
export function RoomDialog({
  organizationId,
  eventId,
  terms,
  room,
  onChanged,
  trigger,
}: RoomDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [failure, setFailure] = useState<RoomSaveError | null>(null)
  const saveRoom = useSaveRoom(organizationId, eventId, onChanged)
  const refreshRooms = useRefreshRooms(organizationId, eventId)

  const initialValues: RoomFormValues = room
    ? { label: room.label, bedCount: String(room.bedCount), termIds: room.termIds }
    : NEW_ROOM

  const handleOpenChange = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    setFailure(null)
  }

  const handleSubmit = async (input: RoomInput) => {
    setFailure(null)
    try {
      await saveRoom.mutateAsync({ roomId: room?.id, input })
      setIsOpen(false)
      toast.success(room ? "Pokoj byl upraven." : "Pokoj byl přidán.")
    } catch (error) {
      const described = describeRoomError(
        error,
        "Pokoj se nepodařilo uložit. Zkuste to prosím znovu.",
      )
      setFailure(described)
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
          <DialogTitle>{room ? "Upravit pokoj" : "Nový pokoj"}</DialogTitle>
          <DialogDescription className="sr-only">
            Označení, počet lůžek a termíny, ve kterých je pokoj dostupný.
          </DialogDescription>
        </DialogHeader>
        <RoomForm
          initialValues={initialValues}
          terms={terms}
          organizationId={organizationId}
          eventId={eventId}
          isLoading={saveRoom.isPending}
          errorMessage={failure?.errorMessage}
          fieldError={failure?.fieldError}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
