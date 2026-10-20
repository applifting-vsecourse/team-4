import { describe, expect, it } from "vitest"

import { formatCalendarDate, formatCalendarRange } from "@/lib/date"

describe("calendar dates", () => {
  it("formats a date without a time zone shift", () => {
    expect(formatCalendarDate("2027-07-01")).toBe("1. 7. 2027")
  })

  it("shortens a range within one year", () => {
    expect(formatCalendarRange("2027-07-01", "2027-07-07")).toBe("1. 7. – 7. 7. 2027")
  })

  it("keeps both years across a new year", () => {
    expect(formatCalendarRange("2026-12-30", "2027-01-02")).toBe("30. 12. 2026 – 2. 1. 2027")
  })

  it("shows one date for a one-day term", () => {
    expect(formatCalendarRange("2027-07-08", "2027-07-08")).toBe("8. 7. 2027")
  })
})
