import { readApiError, type CapacityConflict } from "@/lib/apiError"

export type RoomSaveError = {
  fieldError: { field: "label"; message: string } | null
  errorMessage: string | null
  /** Terms the change would drop below their confirmed participants. */
  conflicts: CapacityConflict[]
  /** The rooms changed meanwhile or are gone; reload them. */
  shouldRefresh: boolean
}

/** Maps a refused room write to the field, the capacity conflict or the form-level message. */
export function describeRoomError(error: unknown, fallback: string): RoomSaveError {
  const apiError = readApiError(error)
  const none = { fieldError: null, errorMessage: null, conflicts: [], shouldRefresh: false }
  if (apiError.code === "room_label_taken" && apiError.message) {
    return { ...none, fieldError: { field: "label", message: apiError.message } }
  }
  // The saved room stays as it was; the terms and counts are shown to the organizer.
  if (apiError.code === "capacity_below_confirmed" && apiError.conflicts.length > 0) {
    return { ...none, conflicts: apiError.conflicts, shouldRefresh: true }
  }
  if (apiError.status === 404 || apiError.code === "term_unknown") {
    return {
      ...none,
      errorMessage: apiError.message ?? "Záznam není dostupný.",
      shouldRefresh: true,
    }
  }
  return { ...none, errorMessage: fallback }
}
