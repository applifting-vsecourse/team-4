import { type Locator, type Page } from "@playwright/test"

/** Picks a `yyyy-MM-dd` date in the app's DatePicker behind `field`. */
export async function pickDate(page: Page, field: Locator, date: string) {
  const [year, month, day] = date.split("-").map(Number)
  await field.click()
  // A closing popover lingers during its animation; use the open one.
  const calendar = page.locator('[data-slot="popover-content"][data-state="open"]')
  await calendar.getByRole("combobox", { name: "Vyberte rok" }).selectOption(String(year))
  await calendar
    .getByRole("combobox", { name: "Vyberte měsíc" })
    .selectOption({ index: month! - 1 })
  await calendar.locator(`button[data-day="${day}. ${month}. ${year}"]`).click()
}

/** The value next to a label in a description list (`<dt>`/`<dd>`). */
export function definition(scope: Page | Locator, term: string) {
  return scope
    .locator("dt")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]")
}
