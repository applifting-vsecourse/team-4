import { describe, expect, it } from "vitest"

import { groupByDay } from "@/features/programme/lib/programmeDays"

const item = (id: string, startDate: string, startTime: string, extra = {}) => ({
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
    expect(days[0]?.items.map((entry) => entry.time)).toEqual(["17:00", "19:00"])
    expect(days[1]?.items[0]?.time).toBe("8:30")
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
