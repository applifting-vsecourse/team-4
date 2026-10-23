import { readApiError } from "@/lib/apiError"

export type PaymentSaveError = {
  /** Shown above the form. */
  message: string
  /** Set when the server refused one field; shown at that field. */
  field: "receivedOn" | null
}

/** Maps a refused or failed save; none of them is shown as success (S2-12). */
export function describePaymentError(error: unknown): PaymentSaveError {
  const apiError = readApiError(error)
  if (apiError.code === "received_on_future") {
    return {
      message: apiError.message ?? "Datum přijetí nesmí být v budoucnosti.",
      field: "receivedOn",
    }
  }
  if (apiError.status === 404) {
    return { message: "Přihláška už není dostupná. Platba nebyla uložena.", field: null }
  }
  if (apiError.status === 400 && apiError.message) {
    return { message: apiError.message, field: null }
  }
  return {
    message: "Platbu se nepodařilo uložit. Zůstatek se nezměnil, zkuste to prosím znovu.",
    field: null,
  }
}
