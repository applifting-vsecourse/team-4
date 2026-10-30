import { useState } from "react"
import { toast } from "sonner"

import { type CapacityConflict } from "@/lib/apiError"

import { type Room, type RoomInput, type RoomsOverview } from "@/features/rooms/api/roomSchemas"
import { DeleteRoomCapacityDialog } from "@/features/rooms/components/DeleteRoomCapacityDialog"
import { RoomCapacityDialog } from "@/features/rooms/components/RoomCapacityDialog"
import { TermCapacityOverview } from "@/features/rooms/components/TermCapacityOverview"
import {
  useDeleteRoom,
  useRefreshRooms,
  useSaveRoom,
} from "@/features/rooms/hooks/useRoomMutations"
import { describeRoomError, type RoomSaveError } from "@/features/rooms/lib/roomErrors"
import { toTermSettings } from "@/features/rooms/lib/roomSettings"
import { toTermCapacities } from "@/features/rooms/lib/termCapacities"

type RoomsSectionProps = {
  organizationId: string
  eventId: string
  overview: RoomsOverview
  /** Called after a saved change, e.g. to reload the capacity shown elsewhere. */
  onChanged: () => unknown
}

type Target = { kind: "add" } | { kind: "edit"; room: Room } | { kind: "delete"; room: Room }

const toConflicts = (error: RoomSaveError | null): CapacityConflict[] => error?.conflicts ?? []

// Base beds, extra beds and availability of the rooms in each term (F11-1).
// Rooms stay editable after registration opens; the server protects the
// confirmed participants and names the terms a change would drop below them.
// A closed dialog discards its values; after a refused save it stays open.
export function RoomsSection({ organizationId, eventId, overview, onChanged }: RoomsSectionProps) {
  const [target, setTarget] = useState<Target | null>(null)
  const [pickedTermId, setPickedTermId] = useState<string>()
  const [failure, setFailure] = useState<RoomSaveError | null>(null)
  const saveRoom = useSaveRoom(organizationId, eventId, onChanged)
  const deleteRoom = useDeleteRoom(organizationId, eventId, onChanged)
  const refreshRooms = useRefreshRooms(organizationId, eventId)

  const open = (next: Target | null) => {
    setTarget(next)
    setFailure(null)
  }

  const findRoom = (roomId: string) => overview.rooms.find((room) => room.id === roomId)

  const handleSave = async (input: RoomInput) => {
    const room = target?.kind === "edit" ? target.room : undefined
    setFailure(null)
    try {
      await saveRoom.mutateAsync({ roomId: room?.id, input })
      open(null)
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

  const handleDelete = async () => {
    if (target?.kind !== "delete") return
    setFailure(null)
    try {
      await deleteRoom.mutateAsync(target.room.id)
      open(null)
      toast.success("Pokoj byl odstraněn.")
    } catch (error) {
      const described = describeRoomError(
        error,
        "Pokoj se nepodařilo odstranit. Zkuste to prosím znovu.",
      )
      setFailure(described)
      if (described.shouldRefresh) await refreshRooms()
    }
  }

  // The picked term, or the first one when none is picked or it is gone.
  const selectedTermId =
    overview.terms.find((term) => term.id === pickedTermId)?.id ?? overview.terms[0]?.id ?? ""
  const form = target?.kind === "edit" || target?.kind === "add" ? target : null
  const editedRoom = target?.kind === "edit" ? target.room : undefined

  return (
    <>
      <TermCapacityOverview
        terms={toTermCapacities(overview)}
        selectedTermId={selectedTermId}
        onSelectedTermChange={setPickedTermId}
        onAddRoom={() => open({ kind: "add" })}
        onEditRoom={(roomId) => {
          const room = findRoom(roomId)
          if (room) open({ kind: "edit", room })
        }}
        onDeleteRoom={(roomId) => {
          const room = findRoom(roomId)
          if (room) open({ kind: "delete", room })
        }}
      />
      <RoomCapacityDialog
        isOpen={form !== null}
        isEdit={editedRoom !== undefined}
        label={editedRoom?.label ?? ""}
        terms={toTermSettings(overview.terms, editedRoom)}
        conflicts={toConflicts(failure)}
        errorMessage={failure?.errorMessage ?? undefined}
        labelError={failure?.fieldError?.message}
        isSaving={saveRoom.isPending}
        onOpenChange={(isOpen) => {
          if (!isOpen) open(null)
        }}
        onSubmit={handleSave}
      />
      <DeleteRoomCapacityDialog
        isOpen={target?.kind === "delete"}
        label={target?.kind === "delete" ? target.room.label : ""}
        conflicts={toConflicts(failure)}
        errorMessage={failure?.errorMessage ?? undefined}
        isDeleting={deleteRoom.isPending}
        onOpenChange={(isOpen) => {
          if (!isOpen) open(null)
        }}
        onConfirm={handleDelete}
      />
    </>
  )
}
