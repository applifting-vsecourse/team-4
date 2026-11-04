import { afterEach, describe, expect, it, vi } from "vitest"

import { NO_NEEDS } from "@/features/registrations/api/registrationSchemas"
import { clearDraft, readDraft, saveDraft } from "@/features/registrations/lib/registrationDraft"

const DRAFT = {
  firstName: "Jana",
  lastName: "Nováková",
  email: "jana@example.test",
  phone: "+420 777 123 456",
  termIds: ["t1", "t2"],
  gender: "other" as const,
  genderOther: "nebinární",
  needs: { ...NO_NEEDS, transport: "shared" as const, diet: ["vegan" as const] },
}

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe("registration draft", () => {
  it("keeps the typed values per event until cleared", () => {
    saveDraft("abc", DRAFT)
    expect(readDraft("abc", ["t1", "t2"])).toEqual(DRAFT)
    expect(readDraft("other", ["t1"])).toBeNull()
    clearDraft("abc")
    expect(readDraft("abc", ["t1", "t2"])).toBeNull()
  })

  it("drops terms that are no longer offered", () => {
    saveDraft("abc", DRAFT)
    expect(readDraft("abc", ["t2"])?.termIds).toEqual(["t2"])
  })

  it("ignores malformed data and unavailable storage", () => {
    window.sessionStorage.setItem("akcio:registration-draft:abc", "{not json")
    expect(readDraft("abc", [])).toBeNull()
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => saveDraft("abc", DRAFT)).not.toThrow()
    expect(readDraft("abc", ["t1"])).toBeNull()
  })
})
