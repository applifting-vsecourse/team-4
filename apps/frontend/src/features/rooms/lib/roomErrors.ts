import { readApiError } from "@/lib/apiError"

export type RoomSaveError = {
  fieldError: { field: "label"; message: string } | null
  errorMessage: string | null
  /** The rooms changed meanwhile or are gone; reload them. */
  shouldRefresh: boolean
}

/** Maps a refused room write to the field or the form-level message. */
export function describeRoomError(error: unknown, fallback: string): RoomSaveError {
  const apiError = readApiError(error)
  if (apiError.code === "room_label_taken" && apiError.message) {
    return {
      fieldError: { field: "label", message: apiError.message },
      errorMessage: null,
      shouldRefresh: false,
    }
  }
  // The message names the term and says capacity cannot fall below confirmed
  // participants; the saved room stays as it was.
  if (apiError.code === "capacity_below_confirmed" && apiError.message) {
    return { fieldError: null, errorMessage: apiError.message, shouldRefresh: true }
  }
  if (apiError.status === 404 || apiError.code === "term_unknown") {
    return {
      fieldError: null,
      errorMessage: apiError.message ?? "Záznam není dostupný.",
      shouldRefresh: true,
    }
  }
  return { fieldError: null, errorMessage: fallback, shouldRefresh: false }
}
