import { describe, expect, it } from "vitest"

import { type RoomTermSetting } from "@/features/rooms/components/RoomCapacityDialog"
import { parseBeds, readRoomForm, toTermSettings } from "@/features/rooms/lib/roomSettings"

const setting = (patch: Partial<RoomTermSetting> = {}): RoomTermSetting => ({
  termId: "t1",
  termLabel: "Turnus 1",
  dates: "4.–17. 7. 2027",
  isAvailable: true,
  beds: "4",
  extraBeds: "1",
  ...patch,
})

describe("parseBeds", () => {
  it.each(["0", "7", " 12 ", "1000"])("accepts %p", (value) => {
    expect(parseBeds(value)).toEqual({ beds: Number(value) })
  })

  it.each(["", "-1", "1,5", "1.5", "abc", "1001"])("refuses %p", (value) => {
    expect(parseBeds(value)).toHaveProperty("error")
  })
})

describe("readRoomForm", () => {
  it("reads beds and availability of each term", () => {
    expect(
      readRoomForm(" Chatka ", [
        setting(),
        setting({ termId: "t2", isAvailable: false, beds: "6", extraBeds: "0" }),
      ]),
    ).toEqual({
      input: {
        label: "Chatka",
        terms: [
          { termId: "t1", isAvailable: true, baseBeds: 4, extraBeds: 1 },
          { termId: "t2", isAvailable: false, baseBeds: 6, extraBeds: 0 },
        ],
      },
    })
  })

  it("marks the invalid fields and saves nothing", () => {
    const result = readRoomForm("Chatka", [setting({ beds: "-1" }), setting({ extraBeds: "1,5" })])
    expect(result).not.toHaveProperty("input")
    const terms = "terms" in result ? result.terms : []
    expect(terms[0]?.bedsError).toBeTruthy()
    expect(terms[1]?.extraBedsError).toBeTruthy()
  })

  it("saves a blank switched-off term as zero beds, but not a blank available one", () => {
    const off = setting({ termId: "t2", isAvailable: false, beds: "", extraBeds: "" })
    expect(readRoomForm("Chatka", [setting(), off])).toEqual({
      input: {
        label: "Chatka",
        terms: [
          { termId: "t1", isAvailable: true, baseBeds: 4, extraBeds: 1 },
          { termId: "t2", isAvailable: false, baseBeds: 0, extraBeds: 0 },
        ],
      },
    })
    expect(readRoomForm("Chatka", [setting({ beds: "" })])).not.toHaveProperty("input")
    expect(readRoomForm("Chatka", [{ ...off, beds: "-1" }])).not.toHaveProperty("input")
  })

  it("refuses an empty label", () => {
    expect(readRoomForm("  ", [setting()])).toMatchObject({ labelError: "Vyplňte označení." })
  })

  it("is valid without terms", () => {
    expect(readRoomForm("Půda", [])).toEqual({ input: { label: "Půda", terms: [] } })
  })
})

describe("toTermSettings", () => {
  const term = (id: string) => ({
    id,
    label: id,
    startDate: "2027-07-04",
    endDate: "2027-07-17",
    baseBeds: 0,
    extraBeds: 0,
    capacity: 0,
    confirmed: 0,
    free: 0,
    waitlisted: 0,
  })
  const room = {
    id: "r",
    label: "Chatka",
    terms: [
      { termId: "t1", isAvailable: true, baseBeds: 4, extraBeds: 0 },
      { termId: "t2", isAvailable: false, baseBeds: 0, extraBeds: 0 },
      { termId: "t3", isAvailable: false, baseBeds: 6, extraBeds: 2 },
    ],
  }

  it("shows saved beds, but leaves a term saved as unavailable without beds blank", () => {
    const settings = toTermSettings([term("t1"), term("t2"), term("t3"), term("t4")], room)
    expect(settings.map((s) => [s.beds, s.extraBeds])).toEqual([
      ["4", "0"],
      ["", ""],
      ["6", "2"],
      ["", ""],
    ])
  })
})
