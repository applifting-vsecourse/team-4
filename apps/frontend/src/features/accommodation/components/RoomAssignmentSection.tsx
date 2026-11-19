import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { placementsQueryOptions } from "@/features/accommodation/api/placementQueryOptions"
import type { PlacementInput } from "@/features/accommodation/api/placementSchemas"
import { PlacementWarningDialog } from "@/features/accommodation/components/PlacementWarningDialog"
import {
  RoomAssignment,
  type AssignmentTerm,
} from "@/features/accommodation/components/RoomAssignment"
import { useSavePlacement } from "@/features/accommodation/hooks/useSavePlacement"
import {
  placementWarnings,
  toPlacementBoard,
  type PlacementWarning,
} from "@/features/accommodation/lib/placements"

const SAVE_FAILED = "Zkuste to prosím znovu."

type Pending = {
  termId: string
  personId: string
  person: string
  roomId: string
  room: string
  isLocked: boolean
  warnings: PlacementWarning[]
}

type RoomAssignmentSectionProps = {
  organizationId: string
  eventId: string
  /** At least one term; the route keeps the selected one in the URL. */
  terms: AssignmentTerm[]
  selectedTermId: string
  onSelectTerm: (termId: string) => void
}

// The saved room placements of the selected term (F14-2). A placement
// without a warning is saved at once; one that breaks a room rule waits for
// the organizer's confirmation in a dialog.
export function RoomAssignmentSection({
  organizationId,
  eventId,
  terms,
  selectedTermId,
  onSelectTerm,
}: RoomAssignmentSectionProps) {
  const placements = useQuery(placementsQueryOptions(organizationId, eventId, selectedTermId))
  const save = useSavePlacement(organizationId, eventId, selectedTermId)
  const [pending, setPending] = useState<Pending | null>(null)
  const data = placements.data

  const store = async (personId: string, input: PlacementInput, success: string) => {
    try {
      await save.mutateAsync({ registrationId: personId, input })
      setPending(null)
      toast.success(success)
    } catch {
      // The dialog shows its own failure.
      if (!pending) toast.error(`Umístění se nepodařilo uložit. ${SAVE_FAILED}`)
    }
  }

  const handleMove = (personId: string, roomId: string | null) => {
    const person = data?.people.find((candidate) => candidate.registrationId === personId)
    if (!data || !person) return
    if (roomId === null) {
      void store(personId, { roomId: null, isLocked: false }, "Účastník byl odebrán z pokoje.")
      return
    }
    const warnings = placementWarnings(data, personId, roomId)
    if (warnings.length === 0) {
      void store(personId, { roomId, isLocked: person.isLocked }, "Umístění bylo uloženo.")
      return
    }
    save.reset()
    setPending({
      termId: selectedTermId,
      personId,
      person: `${person.firstName} ${person.lastName}`,
      roomId,
      room: data.rooms.find((room) => room.id === roomId)?.label ?? "",
      isLocked: person.isLocked,
      warnings,
    })
  }

  const handleLock = (personId: string, isLocked: boolean) => {
    const person = data?.people.find((candidate) => candidate.registrationId === personId)
    if (!person?.roomId) return
    void store(
      personId,
      { roomId: person.roomId, isLocked },
      isLocked ? "Umístění bylo zamčeno." : "Umístění bylo odemčeno.",
    )
  }

  return (
    <>
      <RoomAssignment
        terms={terms}
        selectedTermId={selectedTermId}
        onSelectTerm={onSelectTerm}
        board={data ? toPlacementBoard(data) : undefined}
        isLoadFailed={placements.isError}
        onRetryLoad={placements.refetch}
        isSwitching={placements.isPlaceholderData}
        isSaving={save.isPending}
        onMove={handleMove}
        onLock={handleLock}
      />
      {pending?.termId === selectedTermId ? (
        <PlacementWarningDialog
          person={pending.person}
          room={pending.room}
          warnings={pending.warnings}
          isSaving={save.isPending}
          saveError={save.isError ? SAVE_FAILED : undefined}
          onConfirm={(shouldLock) =>
            store(
              pending.personId,
              { roomId: pending.roomId, isLocked: shouldLock || pending.isLocked },
              "Umístění bylo uloženo.",
            )
          }
          onCancel={() => setPending(null)}
        />
      ) : null}
    </>
  )
}
