import { afterEach, describe, expect, it, vi } from "vitest"

import {
  chooseOrganization,
  lastOrganization,
  rememberOrganization,
} from "@/features/organizations/lib/lastOrganization"

// By name, as the API lists them.
const A1 = { id: "a1", name: "Horolezci" }
const A2 = { id: "a2", name: "Skauti" }
const OWN = [A1, A2]

describe("chooseOrganization", () => {
  it("keeps the organization of the URL when it is own, whatever was used last", () => {
    expect(chooseOrganization(OWN, { fromUrl: "a2", lastUsed: "a1" })).toBe(A2)
  })

  it("falls back to the last used own organization for a foreign or missing one", () => {
    expect(chooseOrganization(OWN, { fromUrl: "b1", lastUsed: "a2" })).toBe(A2)
    expect(chooseOrganization(OWN, { lastUsed: "a2" })).toBe(A2)
  })

  it("takes the first by name when the last used one is no longer own", () => {
    expect(chooseOrganization(OWN, { fromUrl: "b1", lastUsed: "b1" })).toBe(A1)
    expect(chooseOrganization(OWN, {})).toBe(A1)
  })

  it("has nothing to offer without organizations", () => {
    expect(chooseOrganization([], { fromUrl: "a1", lastUsed: "a1" })).toBeUndefined()
  })
})

describe("the last used organization", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("is remembered per account", () => {
    rememberOrganization("user-a", "a2")
    rememberOrganization("user-b", "b1")
    expect(lastOrganization("user-a")).toBe("a2")
    expect(lastOrganization("user-b")).toBe("b1")
    expect(lastOrganization("user-c")).toBeUndefined()
  })

  it("is only a convenience when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    expect(() => rememberOrganization("user-a", "a2")).not.toThrow()
    expect(lastOrganization("user-a")).toBeUndefined()
  })
})
