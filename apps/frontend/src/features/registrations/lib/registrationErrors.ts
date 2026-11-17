import { readApiError } from "@/lib/apiError"

export const CONDITIONS_MESSAGE = "Potvrďte, že jste si přečetli podmínky účasti."

export type RegistrationSubmitError =
  | { kind: "already_registered" }
  | { kind: "unavailable" }
  | { kind: "terms"; message: string }
  | { kind: "conditions"; message: string }
  | { kind: "message"; message: string }

/** Maps a refused or failed submit; none of them is shown as success. */
export function describeRegistrationError(error: unknown): RegistrationSubmitError {
  const apiError = readApiError(error)
  if (apiError.code === "already_registered") return { kind: "already_registered" }
  if (apiError.status === 404) return { kind: "unavailable" }
  if (apiError.code === "term_unknown") {
    return { kind: "terms", message: apiError.message ?? "Vyberte termíny této akce." }
  }
  if (apiError.code === "conditions_unconfirmed") {
    return { kind: "conditions", message: apiError.message ?? CONDITIONS_MESSAGE }
  }
  if (apiError.code === "submission_key_reused" && apiError.message) {
    return { kind: "message", message: apiError.message }
  }
  if (apiError.status === 400 && apiError.message) {
    return { kind: "message", message: apiError.message }
  }
  return {
    kind: "message",
    message:
      "Přihlášku se nepodařilo odeslat. Vyplněné údaje zůstaly zachované, zkuste to prosím znovu.",
  }
}
