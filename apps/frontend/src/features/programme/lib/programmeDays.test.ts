import { describe, expect, it } from "vitest"

import { groupByDay, termCalendar } from "@/features/programme/lib/programmeDays"

const item = (id: string, startDate: string, startTime: string, extra = {}) => ({
  endTime: "23:00",
  id,
  title: `Položka ${id}`,
  startDate,
  startTime,
  place: null,
  description: null,
  ...extra,
})

describe("groupByDay", () => {
  it("splits chronological items into days labelled with the weekday", () => {
    const days = groupByDay([
      item("a", "2026-11-06", "17:00", { place: "Hlavní budova" }),
      item("b", "2026-11-06", "19:00"),
      item("c", "2026-11-07", "08:30"),
    ])
    expect(days.map((day) => day.label)).toEqual(["Pátek 6. 11. 2026", "Sobota 7. 11. 2026"])
    expect(days[0]?.items.map((entry) => entry.time)).toEqual(["17:00 – 23:00", "19:00 – 23:00"])
    expect(days[1]?.items[0]?.time).toBe("8:30 – 23:00")
  })

  it("leaves out a missing place and description instead of inventing them", () => {
    const [day] = groupByDay([item("a", "2026-11-06", "17:00")])
    expect(day?.items[0]?.place).toBeUndefined()
    expect(day?.items[0]?.description).toBeUndefined()
  })

  it("is empty for an empty programme", () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe("termCalendar", () => {
  it("lists every day of the term, the ones without items too", () => {
    const days = termCalendar({ startDate: "2026-11-05", endDate: "2026-11-08" }, [
      item("a", "2026-11-06", "17:00"),
    ])
    expect(days.map((day) => [day.id, day.items.length])).toEqual([
      ["2026-11-05", 0],
      ["2026-11-06", 1],
      ["2026-11-07", 0],
      ["2026-11-08", 0],
    ])
  })

  it("crosses a month and a year end", () => {
    const days = termCalendar({ startDate: "2026-12-30", endDate: "2027-01-02" }, [])
    expect(days.map((day) => day.id)).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ])
  })

  it("is one day for a one-day term", () => {
    expect(termCalendar({ startDate: "2026-11-05", endDate: "2026-11-05" }, [])).toHaveLength(1)
  })

  it("keeps the days of items left outside the term", () => {
    const days = termCalendar({ startDate: "2026-11-06", endDate: "2026-11-07" }, [
      item("a", "2026-11-04", "17:00"),
      item("b", "2026-11-09", "17:00"),
    ])
    expect(days.map((day) => [day.id, day.items.length])).toEqual([
      ["2026-11-04", 1],
      ["2026-11-06", 0],
      ["2026-11-07", 0],
      ["2026-11-09", 1],
    ])
  })
})
