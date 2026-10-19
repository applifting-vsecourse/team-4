import { beforeEach, describe, expect, it } from "vitest"

import {
  pickEntryOrganization,
  recallOrganization,
  rememberOrganization,
} from "@/features/organizations/lib/lastOrganization"

const alfa = { id: "00000000-0000-7000-8000-000000000001", name: "Alfa" }
const beta = { id: "00000000-0000-7000-8000-000000000002", name: "Beta" }

describe("pickEntryOrganization", () => {
  it("opens the remembered organization", () => {
    expect(pickEntryOrganization([alfa, beta], beta.id)).toBe(beta)
  })

  it("falls back to the first organization when nothing is remembered", () => {
    expect(pickEntryOrganization([alfa, beta], null)).toBe(alfa)
  })

  it("ignores a remembered organization the user no longer owns", () => {
    expect(pickEntryOrganization([alfa, beta], "foreign-id")).toBe(alfa)
  })

  it("returns null for an account without organizations", () => {
    expect(pickEntryOrganization([], beta.id)).toBeNull()
  })
})

describe("remembered organization", () => {
  beforeEach(() => localStorage.clear())

  it("is kept per account", () => {
    rememberOrganization("user-1", alfa.id)
    rememberOrganization("user-2", beta.id)
    expect(recallOrganization("user-1")).toBe(alfa.id)
    expect(recallOrganization("user-2")).toBe(beta.id)
    expect(recallOrganization("user-3")).toBeNull()
  })
})
