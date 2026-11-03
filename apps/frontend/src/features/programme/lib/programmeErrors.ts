import { readApiError } from "@/lib/apiError"

export type ProgrammeSaveError = {
  fieldError: { field: "date"; message: string } | null
  errorMessage: string | null
  /** The programme or term changed meanwhile or is gone; reload it. */
  shouldRefresh: boolean
}

/** Maps a refused programme write to the field or the form-level message. */
export function describeProgrammeError(error: unknown, fallback: string): ProgrammeSaveError {
  const apiError = readApiError(error)
  if (
    apiError.field === "startDate" &&
    (apiError.code === "programme_date_out_of_term" ||
      apiError.code === "programme_date_invalid") &&
    apiError.message
  ) {
    return {
      fieldError: { field: "date", message: apiError.message },
      errorMessage: null,
      shouldRefresh: false,
    }
  }
  if (apiError.status === 404) {
    return {
      fieldError: null,
      errorMessage: apiError.message ?? "Záznam není dostupný.",
      shouldRefresh: true,
    }
  }
  return { fieldError: null, errorMessage: fallback, shouldRefresh: false }
}
