import { describe, expect, it } from "vitest"

import {
  buildProposal,
  validateContact,
  type EditState,
} from "@/features/registrations/lib/changeProposal"

const CONTACT = { firstName: "Jana", lastName: "Nováková", phone: "+420604123456" }
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
      moves: [{ fromTermId: T1, toTermId: T3, acceptWaitlist: false }],
      cancelledTermIds: [T2],
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
