import { describe, expect, it } from "vitest"

import { NO_NEEDS } from "@/features/registrations/api/registrationSchemas"
import {
  buildProposal,
  validateContact,
  type EditState,
} from "@/features/registrations/lib/changeProposal"

const T1 = "0190c0de-0000-7000-8000-000000000001"
const T2 = "0190c0de-0000-7000-8000-000000000002"
const T3 = "0190c0de-0000-7000-8000-000000000003"

const CONTACT = {
  firstName: "Jana",
  lastName: "Nováková",
  phone: "+420604123456",
  gender: null,
  genderOther: null,
  needs: NO_NEEDS,
  heldTermIds: [T1, T2],
} satisfies Pick<
  EditState,
  "firstName" | "lastName" | "phone" | "gender" | "genderOther" | "needs"
> & {
  heldTermIds: string[]
}

const state = (overrides: Partial<EditState> = {}): EditState => ({
  firstName: CONTACT.firstName,
  lastName: CONTACT.lastName,
  phone: CONTACT.phone,
  gender: CONTACT.gender,
  genderOther: CONTACT.genderOther,
  needs: CONTACT.needs,
  selectedTermIds: [T1, T2],
  ...overrides,
})

describe("buildProposal", () => {
  it("proposes nothing when nothing differs", () => {
    expect(buildProposal(CONTACT, state())).toBeNull()
  })

  it("proposes nothing for a stored phone that is formatted with spaces", () => {
    expect(
      buildProposal(
        { ...CONTACT, phone: "+420 604 123 456" },
        state({ phone: "+420 604 123 456" }),
      ),
    ).toBeNull()
  })

  it("sends only the changed fields, trimmed, and treats spaces in the phone as the same number", () => {
    expect(buildProposal(CONTACT, state({ phone: "+420 604 123 456" }))).toBeNull()
    expect(
      buildProposal(CONTACT, state({ firstName: "  Anna ", phone: "+420 731 987 654" })),
    ).toEqual({
      firstName: "Anna",
      phone: "+420 731 987 654",
      moves: [],
      cancelledTermIds: [],
    })
  })

  it("sends the needs as a whole, normalized, only when they differ", () => {
    expect(
      buildProposal(CONTACT, state({ needs: { ...NO_NEEDS, dietNote: "  ", health: "" } })),
    ).toBeNull()
    expect(
      buildProposal(
        CONTACT,
        state({
          needs: { ...NO_NEEDS, diet: ["vegan", "vegetarian"], health: " Astma " },
        }),
      ),
    ).toEqual({
      needs: { ...NO_NEEDS, diet: ["vegetarian", "vegan"], health: "Astma" },
      moves: [],
      cancelledTermIds: [],
    })
  })

  it("sends cleared needs to remove what was stored", () => {
    const stored = { ...CONTACT, needs: { ...NO_NEEDS, transport: "own" as const } }
    expect(buildProposal(stored, state())).toEqual({
      needs: NO_NEEDS,
      moves: [],
      cancelledTermIds: [],
    })
  })

  it("cancels a held term that is unticked (F35-2c)", () => {
    expect(buildProposal(CONTACT, state({ selectedTermIds: [T2] }))).toEqual({
      moves: [],
      cancelledTermIds: [T1],
    })
  })

  it("adds a ticked term next to the held ones without touching them (F35-2c)", () => {
    expect(buildProposal(CONTACT, state({ selectedTermIds: [T1, T2, T3] }))).toEqual({
      moves: [],
      cancelledTermIds: [],
      addedTermIds: [T3],
    })
  })

  it("replaces a term by cancelling one and adding another (F35-2c)", () => {
    expect(buildProposal(CONTACT, state({ selectedTermIds: [T2, T3] }))).toEqual({
      moves: [],
      cancelledTermIds: [T1],
      addedTermIds: [T3],
    })
  })

  it("cancels everything when no term stays selected", () => {
    expect(buildProposal(CONTACT, state({ selectedTermIds: [] }))).toEqual({
      moves: [],
      cancelledTermIds: [T1, T2],
    })
  })

  it("sends a changed gender answer, and null when it is cleared (F64)", () => {
    expect(buildProposal(CONTACT, state({ gender: "undisclosed" }))).toEqual({
      gender: "undisclosed",
      moves: [],
      cancelledTermIds: [],
    })
    expect(buildProposal({ ...CONTACT, gender: "male" }, state({ gender: "male" }))).toBeNull()
    expect(buildProposal({ ...CONTACT, gender: "male" }, state())).toEqual({
      gender: null,
      moves: [],
      cancelledTermIds: [],
    })
  })

  it("sends own words only beside Jiná odpověď, trimmed, and null when they are removed", () => {
    expect(buildProposal(CONTACT, state({ gender: "other", genderOther: "  nebinární " }))).toEqual(
      { gender: "other", genderOther: "nebinární", moves: [], cancelledTermIds: [] },
    )

    const other = { ...CONTACT, gender: "other", genderOther: "nebinární" } as const
    expect(buildProposal(other, state({ ...other }))).toBeNull()
    expect(buildProposal(other, state({ gender: "other", genderOther: " " }))).toEqual({
      genderOther: null,
      moves: [],
      cancelledTermIds: [],
    })
    // Another answer drops the words on the server; they are not sent.
    expect(buildProposal(other, state({ gender: "male", genderOther: null }))).toEqual({
      gender: "male",
      moves: [],
      cancelledTermIds: [],
    })
  })
})

describe("validateContact", () => {
  it("requires the names and an international phone", () => {
    expect(validateContact(state({ firstName: " ", lastName: "", phone: "604123456" }))).toEqual({
      firstName: "Vyplňte jméno.",
      lastName: "Vyplňte příjmení.",
      phone: "Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456.",
    })
    expect(validateContact(state())).toEqual({})
  })
})
