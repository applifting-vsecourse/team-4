import { describe, expect, it } from "vitest"

import { readProgrammeForm } from "@/features/programme/lib/programmeInput"

const TERM = { startDate: "2026-11-06", endDate: "2026-11-08" }
const VALID = {
  title: " Večeře ",
  date: "2026-11-06",
  time: "19:00",
  place: "  ",
  description: "",
}

describe("readProgrammeForm", () => {
  it("trims the text and turns blank optional fields into null", () => {
    expect(readProgrammeForm(VALID, TERM)).toEqual({
      input: {
        title: "Večeře",
        startDate: "2026-11-06",
        startTime: "19:00",
        place: null,
        description: null,
      },
    })
  })

  it("explains every wrong required field and keeps the rest", () => {
    const result = readProgrammeForm({ ...VALID, title: " ", date: "", time: "" }, TERM)
    expect(result).toEqual({
      errors: {
        title: "Vyplňte název položky.",
        date: "Vyberte platné datum.",
        time: "Zadejte čas začátku.",
      },
    })
  })

  it("accepts both ends of the term and refuses days outside it", () => {
    expect("input" in readProgrammeForm({ ...VALID, date: "2026-11-08" }, TERM)).toBe(true)
    expect(readProgrammeForm({ ...VALID, date: "2026-11-09" }, TERM)).toEqual({
      errors: { date: "Datum musí být v rozsahu termínu, 6. 11. – 8. 11. 2026." },
    })
    expect("errors" in readProgrammeForm({ ...VALID, date: "2026-11-05" }, TERM)).toBe(true)
  })

  it("refuses an impossible date and a time that is not HH:mm", () => {
    expect("errors" in readProgrammeForm({ ...VALID, date: "2026-02-31" }, TERM)).toBe(true)
    expect("errors" in readProgrammeForm({ ...VALID, time: "24:00" }, TERM)).toBe(true)
  })
})
