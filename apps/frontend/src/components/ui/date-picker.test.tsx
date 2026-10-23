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
})
