import { readApiError } from "@/lib/apiError"

/** The participant session is gone (expired or logged out elsewhere): S2-13 asks for a new link. */
export const isSessionRefused = (error: unknown) => readApiError(error).status === 401

/** The registration is not the participant's or does not exist; both look the same. */
export const isRegistrationUnavailable = (error: unknown) => readApiError(error).status === 404
