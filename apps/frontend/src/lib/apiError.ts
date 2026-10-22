import { HTTPError } from "@/lib/api-client"

export type ApiErrorCode =
  | "event_locked"
  | "term_overlap"
  | "term_dates"
  | "bank_account_invalid"
  | "payment_settings_invalid"
  | "opening_conditions_not_met"
  | "event_not_draft"
  | "room_label_taken"
  | "capacity_below_confirmed"
  | "term_unknown"
  | "event_unavailable"
  | "already_registered"
  | "submission_key_reused"

export type ApiError = {
  status: number | null
  code: ApiErrorCode | null
  field: string | null
  message: string | null
}

/**
 * Reads the `code` and `field` the API puts next to its message. ky reads the
 * error response body itself and hands it over as `error.data`; the response
 * body can no longer be read.
 */
export function readApiError(error: unknown): ApiError {
  if (!(error instanceof HTTPError)) {
    return { status: null, code: null, field: null, message: null }
  }
  const body: unknown = error.data
  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  return {
    status: error.response.status,
    code: typeof fields.code === "string" ? (fields.code as ApiErrorCode) : null,
    field: typeof fields.field === "string" ? fields.field : null,
    message: typeof fields.message === "string" ? fields.message : null,
  }
}
