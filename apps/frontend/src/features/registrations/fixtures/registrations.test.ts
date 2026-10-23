import { describe, expect, it } from "vitest"

import {
  paymentStateSchema,
  registrationDetailSchema,
  registrationListSchema,
  registrationSummarySchema,
} from "@/features/registrations/api/eventRegistrationSchemas"
import {
  makeRegistrationDetail,
  makeRegistrationList,
  makeRegistrationSummary,
} from "@/features/registrations/fixtures/registrations"

describe("registration fixtures", () => {
  it("build a list the API schema accepts", () => {
    const list = makeRegistrationList()
    expect(registrationListSchema.parse(list)).toEqual(list)
    expect(list.registrations.length).toBeGreaterThan(0)
    expect(list.total).toBe(list.registrations.length)
  })

  it("apply overrides", () => {
    expect(makeRegistrationSummary({ paymentState: "overpaid" }).paymentState).toBe("overpaid")
  })

  it.each(paymentStateSchema.options)("build a valid summary in payment state %s", (state) => {
    expect(() =>
      registrationSummarySchema.parse(makeRegistrationSummary({ paymentState: state })),
    ).not.toThrow()
  })

  it("reject an override that breaks the contract", () => {
    expect(() => makeRegistrationSummary({ id: "not-a-uuid" })).toThrow()
  })

  it("build a detail the API schema accepts", () => {
    const detail = makeRegistrationDetail()
    expect(registrationDetailSchema.parse(detail)).toEqual(detail)
  })
})
