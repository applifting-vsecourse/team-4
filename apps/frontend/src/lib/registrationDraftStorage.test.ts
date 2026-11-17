import { afterEach, describe, expect, it } from "vitest"

import { clearRegistrationDrafts, REGISTRATION_DRAFT_PREFIX } from "@/lib/registrationDraftStorage"

afterEach(() => {
  window.sessionStorage.clear()
})

describe("registration draft storage", () => {
  it("forgets every registration draft of the tab, and nothing else (S4-08)", () => {
    window.sessionStorage.setItem(`${REGISTRATION_DRAFT_PREFIX}abc`, "{}")
    window.sessionStorage.setItem(`${REGISTRATION_DRAFT_PREFIX}def`, "{}")
    window.sessionStorage.setItem("other", "kept")

    clearRegistrationDrafts()

    expect(window.sessionStorage.getItem(`${REGISTRATION_DRAFT_PREFIX}abc`)).toBeNull()
    expect(window.sessionStorage.getItem(`${REGISTRATION_DRAFT_PREFIX}def`)).toBeNull()
    expect(window.sessionStorage.getItem("other")).toBe("kept")
  })
})
