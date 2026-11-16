import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DatePicker } from "@/components/ui/date-picker"

describe("DatePicker", () => {
  it("lets an organizer pick a date in the next years, not only this one", async () => {
    render(
      <DatePicker
        aria-label="Začátek"
        value=""
        onChange={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Začátek" }))

    const years = screen.getByRole("combobox", { name: "Vyberte rok" })
    const nextYear = String(new Date().getFullYear() + 1)
    expect(screen.getByRole("option", { name: nextYear })).toBeInTheDocument()
    await userEvent.selectOptions(years, nextYear)
    expect(years).toHaveValue(nextYear)
  })

  it("marks days before a limit and days of taken ranges, keeping them selectable", async () => {
    render(
      <DatePicker
        aria-label="Konec"
        value="2027-08-10"
        markedBefore="2027-08-05"
        markedRanges={[{ from: "2027-08-20", to: "2027-08-22" }]}
        markedLegend="Červeně: nelze"
        onChange={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Konec" }))

    const isMarked = (day: string) =>
      document.querySelector(`td[data-day="${day}"]`)!.className.includes("bg-destructive-subtle")
    expect(isMarked("2027-08-03")).toBe(true)
    expect(isMarked("2027-08-21")).toBe(true)
    expect(isMarked("2027-08-08")).toBe(false)
    expect(screen.getByText("Červeně: nelze")).toBeInTheDocument()
  })

  it("does not let a day outside the allowed bounds be picked; the bounds themselves can", async () => {
    const onChange = vi.fn()
    render(
      <DatePicker
        aria-label="Termín do"
        value=""
        disabledBefore="2027-08-05"
        disabledAfter="2027-08-25"
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Termín do" }))

    const day = (date: string) => document.querySelector(`td[data-day="${date}"] button`)!
    expect(day("2027-08-04")).toBeDisabled()
    expect(day("2027-08-26")).toBeDisabled()
    await userEvent.click(day("2027-08-04"))
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.click(day("2027-08-05"))
    expect(onChange).toHaveBeenCalledWith("2027-08-05")
  })
})
