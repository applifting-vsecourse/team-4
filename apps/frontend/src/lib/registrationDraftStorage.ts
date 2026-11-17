// The public registration form keeps a draft per event for the browser tab
// (F55). Shared so that a participant's logout can forget them too (S4-08).
export const REGISTRATION_DRAFT_PREFIX = "akcio:registration-draft:"

/** Every registration draft of the tab, and nothing else. */
export function clearRegistrationDrafts() {
  try {
    const storage = window.sessionStorage
    Object.keys(storage)
      .filter((stored) => stored.startsWith(REGISTRATION_DRAFT_PREFIX))
      .forEach((stored) => storage.removeItem(stored))
  } catch {
    // Nothing was stored.
  }
}
