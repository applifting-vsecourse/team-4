import { HTTPError } from "@/lib/api-client"

export type ApiErrorCode =
  | "event_locked"
  | "term_overlap"
  | "term_dates"
  | "bank_account_invalid"
  | "payment_settings_invalid"
  | "opening_conditions_not_met"
  | "event_not_draft"

export type ApiError = {
  status: number | null
  code: ApiErrorCode | null
  field: string | null
  message: string | null
}

/** Reads the `code` and `field` the events API puts next to its message. */
export async function readApiError(error: unknown): Promise<ApiError> {
  if (!(error instanceof HTTPError)) {
    return { status: null, code: null, field: null, message: null }
  }
  try {
    const body = (await error.response.clone().json()) as Record<string, unknown>
    return {
      status: error.response.status,
      code: typeof body.code === "string" ? (body.code as ApiErrorCode) : null,
      field: typeof body.field === "string" ? body.field : null,
      message: typeof body.message === "string" ? body.message : null,
    }
  } catch {
    return { status: error.response.status, code: null, field: null, message: null }
  }
}
