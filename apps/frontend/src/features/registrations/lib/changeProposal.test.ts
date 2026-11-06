import { describe, expect, it } from "vitest"

import { NO_NEEDS } from "@/features/registrations/api/registrationSchemas"
import {
  buildProposal,
  validateContact,
  type EditState,
} from "@/features/registrations/lib/changeProposal"

const CONTACT = {
  firstName: "Jana",
  lastName: "Nováková",
  phone: "+420604123456",
  gender: null,
  genderOther: null,
  needs: NO_NEEDS,
} satisfies Pick<EditState, "firstName" | "lastName" | "phone" | "gender" | "genderOther" | "needs">
const T1 = "0190c0de-0000-7000-8000-000000000001"
const T2 = "0190c0de-0000-7000-8000-000000000002"
const T3 = "0190c0de-0000-7000-8000-000000000003"

const state = (overrides: Partial<EditState> = {}): EditState => ({
  ...CONTACT,
  terms: {
    [T1]: { selectedTermId: T1, isCancelled: false },
    [T2]: { selectedTermId: T2, isCancelled: false },
  },
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

  it("turns a term picked for another term into a move and a ticked one into a cancellation", () => {
    expect(
      buildProposal(
        CONTACT,
        state({
          terms: {
            [T1]: { selectedTermId: T3, isCancelled: false },
            [T2]: { selectedTermId: T2, isCancelled: true },
          },
        }),
      ),
    ).toEqual({
      moves: [{ fromTermId: T1, toTermId: T3, acceptRelease: false }],
      cancelledTermIds: [T2],
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

  it("ignores the target of a term that is being cancelled", () => {
    expect(
      buildProposal(CONTACT, state({ terms: { [T1]: { selectedTermId: T3, isCancelled: true } } })),
    ).toEqual({ moves: [], cancelledTermIds: [T1] })
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
