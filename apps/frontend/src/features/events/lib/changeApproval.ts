// The largest value the stored 32-bit column holds; no business limit (F35-1a).
const MAX_CHANGE_APPROVAL_DAYS = 2_147_483_647

export const CHANGE_APPROVAL_INVALID = "Zadejte nezáporné celé číslo dní."

export type ParsedDays = { ok: true; days: number | null } | { ok: false; message: string }

/** Empty text removes the setting; anything but a non-negative whole number is refused. */
export const parseApprovalDays = (text: string): ParsedDays => {
  const trimmed = text.trim()
  if (trimmed === "") return { ok: true, days: null }
  if (!/^[0-9]+$/.test(trimmed)) return { ok: false, message: CHANGE_APPROVAL_INVALID }
  const days = Number(trimmed)
  if (days > MAX_CHANGE_APPROVAL_DAYS) return { ok: false, message: "Zadejte menší počet dní." }
  return { ok: true, days }
}

export const describeApprovalSetting = (days: number | null): string => {
  if (days === null) return "Žádné změny přihlášek nepodléhají vašemu schválení"
  if (days === 0) return "Schvalujete změny přihlášek ode dne začátku termínu"
  const unit = days === 1 ? "dne" : "dnů"
  return `Schvalujete změny přihlášek od ${days} ${unit} před začátkem termínu`
}
