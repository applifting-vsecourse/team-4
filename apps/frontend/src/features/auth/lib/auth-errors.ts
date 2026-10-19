export type AuthFailureCode = "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "UNKNOWN"

export class AuthFailure extends Error {
  constructor(
    readonly code: AuthFailureCode,
    message: string,
  ) {
    super(message)
  }
}

type BetterAuthError = { code?: string; message?: string } | null

export function signInFailure(error: NonNullable<BetterAuthError>) {
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return new AuthFailure("INVALID_CREDENTIALS", "Nesprávný e-mail nebo heslo.")
  }
  return new AuthFailure("UNKNOWN", "Přihlášení se nezdařilo. Zkuste to prosím znovu.")
}

export function signUpFailure(error: NonNullable<BetterAuthError>) {
  if (error.code?.startsWith("USER_ALREADY_EXISTS")) {
    return new AuthFailure("EMAIL_TAKEN", "Účet s tímto e-mailem už existuje.")
  }
  return new AuthFailure("UNKNOWN", "Registrace se nezdařila. Zkuste to prosím znovu.")
}
