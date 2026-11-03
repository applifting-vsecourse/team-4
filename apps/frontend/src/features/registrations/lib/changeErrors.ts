import { HTTPError } from "@/lib/api-client"
import { readApiError } from "@/lib/apiError"

import {
  changePreviewSchema,
  type ChangePreview,
} from "@/features/registrations/api/registrationChangeSchemas"

export type ChangeError =
  /** The registration changed meanwhile; the proposal must not overwrite it. */
  | { kind: "stale" }
  /** The refusal carries a fresh review: approval or the waitlist now applies. */
  | { kind: "approval_changed"; preview: ChangePreview }
  | { kind: "waitlist_consent_required"; preview: ChangePreview }
  | { kind: "message"; message: string }

const FALLBACK = "Změnu se nepodařilo odeslat. Zkuste to prosím znovu."

const readPreview = (error: unknown): ChangePreview | null => {
  if (!(error instanceof HTTPError)) return null
  const data: unknown = error.data
  const preview =
    typeof data === "object" && data !== null ? (data as { preview?: unknown }).preview : null
  const parsed = changePreviewSchema.safeParse(preview)
  return parsed.success ? parsed.data : null
}

/** Maps a refused or failed submit; none of them is shown as success. */
export function describeChangeError(error: unknown): ChangeError {
  const { code, status, message } = readApiError(error)
  const preview = readPreview(error)
  if (code === "registration_stale") return { kind: "stale" }
  if (code === "approval_changed" && preview) return { kind: "approval_changed", preview }
  if (code === "waitlist_consent_required" && preview) {
    return { kind: "waitlist_consent_required", preview }
  }
  if (status === 400 || status === 409) {
    return { kind: "message", message: message ?? FALLBACK }
  }
  return { kind: "message", message: FALLBACK }
}
