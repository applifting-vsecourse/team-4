import { describe, expect, it } from "vitest"

import { formatCalendarDate, formatCalendarRange, formatPragueDate } from "@/lib/date"

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

describe("Prague dates", () => {
  it("takes the day in Prague, not in UTC", () => {
    // 23:30 UTC on 27 June is already 28 June in Prague (UTC+2 in summer).
    expect(formatPragueDate("2027-06-27T23:30:00Z")).toBe("28. 6. 2027")
  })
})
