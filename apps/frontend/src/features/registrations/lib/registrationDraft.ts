import { z } from "zod"

// What a visitor typed into the registration form, kept for the browser tab
// (F55): leaving for the event detail and coming back keeps the values.
// Storage may be unavailable (private mode, blocked site data); the form then
// simply starts empty.

const draftSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  termIds: z.array(z.string()),
})

export type RegistrationDraft = z.infer<typeof draftSchema>

const key = (publicId: string) => `akcio:registration-draft:${publicId}`

/** Terms that no longer exist are dropped, so only selectable ones come back. */
export function readDraft(publicId: string, termIds: string[]): RegistrationDraft | null {
  try {
    const stored = window.sessionStorage.getItem(key(publicId))
    if (!stored) return null
    const draft = draftSchema.safeParse(JSON.parse(stored))
    if (!draft.success) return null
    return { ...draft.data, termIds: draft.data.termIds.filter((id) => termIds.includes(id)) }
  } catch {
    return null
  }
}

export function saveDraft(publicId: string, draft: RegistrationDraft) {
  try {
    window.sessionStorage.setItem(key(publicId), JSON.stringify(draft))
  } catch {
    // Without storage the values are kept only while the form is open.
  }
}

export function clearDraft(publicId: string) {
  try {
    window.sessionStorage.removeItem(key(publicId))
  } catch {
    // Nothing was stored.
  }
}
