import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { placementKeys, placementsPath } from "@/features/accommodation/api/placementQueryOptions"
import {
  placementWarningsErrorSchema,
  termPlacementsSchema,
  type ConfirmableWarning,
  type TermPlacements,
} from "@/features/accommodation/api/placementSchemas"
import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"

/** One change of one participant's placement in the term. */
export type PlacementChange =
  /** Into a room or to another one; the room's warnings must all be confirmed. */
  | {
      kind: "place"
      roomId: string
      confirmWarnings: ConfirmableWarning[]
      /** Locks the placement as it is saved; unset keeps the current lock. */
      lock?: boolean
    }
  | { kind: "remove" }
  | { kind: "lock"; isLocked: boolean }

export type PlacementResult =
  | { kind: "saved"; placements: TermPlacements }
  /** The room would warn about more than confirmed; nothing was saved. */
  | { kind: "needs_confirmation"; warnings: ConfirmableWarning[] }

/**
 * Saves one change of a participant's room or lock in the term. The answer is
 * the term's placements read back from the database; it replaces the cache,
 * so the board never shows an unsaved placement. A 409 `placement_warnings`
 * is an answer, not a failure: the organizer is asked to confirm. A failed
 * save reloads the placements. A saved one makes the room proposals and the
 * wish states of the event's terms out of date (#365): they reload, without
 * the board waiting for them.
 */
export function useSavePlacement(organizationId: string, eventId: string, termId: string) {
  const queryClient = useQueryClient()
  const queryKey = placementKeys.term(organizationId, eventId, termId)
  return useMutation({
    mutationFn: async ({
      registrationId,
      change,
    }: {
      registrationId: string
      change: PlacementChange
    }): Promise<PlacementResult> => {
      const path = `${placementsPath(organizationId, eventId, termId)}/${registrationId}`
      try {
        const response =
          change.kind === "place"
            ? api.put(path, {
                json: {
                  roomId: change.roomId,
                  confirmWarnings: change.confirmWarnings,
                  ...(change.lock === undefined ? {} : { lock: change.lock }),
                },
              })
            : change.kind === "remove"
              ? api.delete(path)
              : api.put(`${path}/lock`, { json: { isLocked: change.isLocked } })
        return { kind: "saved", placements: termPlacementsSchema.parse(await response.json()) }
      } catch (error) {
        const refused =
          error instanceof HTTPError && error.response.status === 409
            ? placementWarningsErrorSchema.safeParse(error.data)
            : null
        if (refused?.success) return { kind: "needs_confirmation", warnings: refused.data.warnings }
        throw error
      }
    },
    onSuccess: async (result) => {
      if (result.kind === "saved") {
        queryClient.setQueryData(queryKey, result.placements)
        void queryClient.invalidateQueries({
          queryKey: roomProposalKeys.terms(organizationId, eventId),
        })
      }
      // The board was behind the room the server checked.
      else await queryClient.invalidateQueries({ queryKey })
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
  })
}
