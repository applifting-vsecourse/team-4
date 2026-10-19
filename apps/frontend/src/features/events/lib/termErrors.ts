import { readApiError } from "@/features/events/lib/apiError"

export type TermSaveError = {
  fieldError: { field: "startDate" | "endDate"; message: string } | null
  errorMessage: string | null
  /** The event changed meanwhile (e.g. it got locked); reload it. */
  shouldRefresh: boolean
}

/** Maps a refused term write to the field or the form-level message. */
export async function describeTermError(error: unknown, fallback: string): Promise<TermSaveError> {
  const apiError = await readApiError(error)
  const field = apiError.field
  if (
    (apiError.code === "term_overlap" || apiError.code === "term_dates") &&
    (field === "startDate" || field === "endDate") &&
    apiError.message
  ) {
    return {
      fieldError: { field, message: apiError.message },
      errorMessage: null,
      shouldRefresh: false,
    }
  }
  if (apiError.code === "event_locked") {
    return { fieldError: null, errorMessage: apiError.message, shouldRefresh: true }
  }
  if (apiError.status === 404) {
    return { fieldError: null, errorMessage: "Záznam není dostupný.", shouldRefresh: true }
  }
  if (apiError.status === 400 && apiError.message) {
    return { fieldError: null, errorMessage: apiError.message, shouldRefresh: false }
  }
  return { fieldError: null, errorMessage: fallback, shouldRefresh: false }
}
