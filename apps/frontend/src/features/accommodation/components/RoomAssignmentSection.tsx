import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadError } from "@/components/LoadError"
import { readApiError } from "@/lib/apiError"

import {
  placementKeys,
  placementsQueryOptions,
} from "@/features/accommodation/api/placementQueryOptions"
import type { TermPlacements } from "@/features/accommodation/api/placementSchemas"
import { publicationQueryOptions } from "@/features/accommodation/api/publicationQueryOptions"
import { PlacementWarningDialog } from "@/features/accommodation/components/PlacementWarningDialog"
import { RoomAssignment } from "@/features/accommodation/components/RoomAssignment"
import { RoomPublicationControl } from "@/features/accommodation/components/RoomPublicationControl"
import {
  useSavePlacement,
  type PlacementChange,
} from "@/features/accommodation/hooks/useSavePlacement"
import { useSetPublication } from "@/features/accommodation/hooks/useSetPublication"
import {
  describeWarnings,
  offersLock,
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
  warnings: PlacementWarning[]
  /** The server found other warnings than the board showed. */
  isUpdated: boolean
  shouldLock: boolean
}

/** Refusals a retry can't change: the dialog closes with the server's message. */
const FINAL_REFUSALS = new Set([
  "placement_locked",
  "room_unavailable",
  "participant_not_confirmed",
])

type RoomAssignmentSectionProps = {
  organizationId: string
  eventId: string
  /** The term the page's tabs selected; the route keeps it in the URL. */
  selectedTermId: string
}

// The saved room placements of the selected term (F14-2). A placement
// without a warning is saved at once; one that breaks a room rule waits for
// the organizer's confirmation in a dialog. The server checks the rules
// again: when its room differs from the board's (someone else placed
// meanwhile), the dialog shows the warnings it found, and only those
// confirmed are saved.
export function RoomAssignmentSection({
  organizationId,
  eventId,
  selectedTermId,
}: RoomAssignmentSectionProps) {
  const queryClient = useQueryClient()
  const placements = useQuery(placementsQueryOptions(organizationId, eventId, selectedTermId))
  const save = useSavePlacement(organizationId, eventId, selectedTermId)
  const publication = useQuery(publicationQueryOptions(organizationId, eventId, selectedTermId))
  const setPublication = useSetPublication(organizationId, eventId)
  const [pending, setPending] = useState<Pending | null>(null)
  const [saveError, setSaveError] = useState<string>()
  const data = placements.data

  const askToConfirm = (
    current: TermPlacements,
    personId: string,
    roomId: string,
    warnings: PlacementWarning[],
    isUpdated: boolean,
  ) => {
    const person = current.people.find((candidate) => candidate.registrationId === personId)
    if (!person) {
      setPending(null)
      toast.error("Účastník už v termínu není potvrzený.")
      return
    }
    setSaveError(undefined)
    setPending((previous) => ({
      termId: selectedTermId,
      personId,
      person: person.name,
      roomId,
      room: current.rooms.find((room) => room.id === roomId)?.label ?? "",
      warnings,
      isUpdated,
      // The organizer's lock choice survives updated warnings.
      shouldLock: previous?.personId === personId ? previous.shouldLock : false,
    }))
  }

  const store = async (personId: string, change: PlacementChange, success: string) => {
    try {
      const result = await save.mutateAsync({ registrationId: personId, change })
      if (result.kind === "needs_confirmation" && change.kind === "place") {
        // The placements reloaded with the answer; word the server's warnings from them.
        const fresh =
          queryClient.getQueryData<TermPlacements>(
            placementKeys.term(organizationId, eventId, selectedTermId),
          ) ?? data
        if (fresh) {
          askToConfirm(
            fresh,
            personId,
            change.roomId,
            describeWarnings(fresh, personId, change.roomId, result.warnings),
            true,
          )
        }
        return
      }
      setPending(null)
      toast.success(success)
    } catch (error) {
      const { code, message } = readApiError(error)
      const text = message ?? SAVE_FAILED
      // The dialog shows a failure worth retrying; anything final closes it.
      if (pending && !(code && FINAL_REFUSALS.has(code))) setSaveError(text)
      else {
        setPending(null)
        toast.error(`Umístění se nepodařilo uložit. ${text}`)
      }
    }
  }

  const handleMove = (personId: string, roomId: string | null) => {
    const person = data?.people.find((candidate) => candidate.registrationId === personId)
    if (!data || !person || person.isLocked) return
    if (roomId === null) {
      void store(personId, { kind: "remove" }, "Účastník byl odebrán z pokoje.")
      return
    }
    if (!data.rooms.find((room) => room.id === roomId)?.isAvailable) {
      toast.error("Pokoj v tomto termínu není k dispozici.")
      return
    }
    const warnings = placementWarnings(data, personId, roomId)
    if (warnings.length === 0) {
      void store(personId, { kind: "place", roomId, confirmWarnings: [] }, "Umístění bylo uloženo.")
      return
    }
    save.reset()
    setPending(null)
    askToConfirm(data, personId, roomId, warnings, false)
  }

  const handleLock = (personId: string, isLocked: boolean) => {
    void store(
      personId,
      { kind: "lock", isLocked },
      isLocked ? "Umístění bylo zamčeno." : "Umístění bylo odemčeno.",
    )
  }

  return (
    <>
      <RoomAssignment
        board={data ? toPlacementBoard(data) : undefined}
        isLoadFailed={placements.isError}
        onRetryLoad={placements.refetch}
        isSwitching={placements.isPlaceholderData}
        isSaving={save.isPending}
        onMove={handleMove}
        onLock={handleLock}
        actions={
          publication.isError ? null : (
            <RoomPublicationControl
              publication={publication.data}
              isSwitching={publication.isPlaceholderData}
              isSaving={setPublication.isPending}
              onChange={(isPublished) =>
                setPublication.mutate(
                  { termId: selectedTermId, isPublished },
                  {
                    onSuccess: () =>
                      toast.success(
                        isPublished
                          ? "Rozdělení je zveřejněné účastníkům."
                          : "Zveřejnění rozdělení je zrušené.",
                      ),
                    onError: () =>
                      toast.error("Zveřejnění se nepodařilo změnit. Zkuste to prosím znovu."),
                  },
                )
              }
            />
          )
        }
        notice={
          publication.isError ? (
            <LoadError
              title="Stav zveřejnění se nepodařilo načíst"
              onRetry={publication.refetch}
              isRetrying={publication.isFetching}
            />
          ) : null
        }
      />
      {pending?.termId === selectedTermId ? (
        <PlacementWarningDialog
          person={pending.person}
          room={pending.room}
          warnings={pending.warnings}
          isUpdated={pending.isUpdated}
          shouldLock={pending.shouldLock}
          onShouldLockChange={(shouldLock) =>
            setPending((current) => current && { ...current, shouldLock })
          }
          isSaving={save.isPending}
          saveError={saveError}
          onConfirm={() => {
            setSaveError(undefined)
            return store(
              pending.personId,
              {
                kind: "place",
                roomId: pending.roomId,
                confirmWarnings: pending.warnings.map((warning) => warning.kind),
                ...(pending.shouldLock && offersLock(pending.warnings) ? { lock: true } : {}),
              },
              "Umístění bylo uloženo.",
            )
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </>
  )
}
