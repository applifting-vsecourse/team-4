import { type Frame, type Locator, type Page } from "@playwright/test"

/** Picks a `yyyy-MM-dd` date in the app's DatePicker behind `field`. */
export async function pickDate(
  page: Page,
  field: Locator,
  date: string,
  { pace = "normal" }: { pace?: "normal" | "quick" } = {},
) {
  const [year, month, day] = date.split("-").map(Number)
  await field.click()
  // A closing popover lingers during its animation; use the open one.
  const calendar = page.locator('[data-slot="popover-content"][data-state="open"]')
  const yearSelect = calendar.getByRole("combobox", { name: "Vyberte rok" })
  const monthSelect = calendar.getByRole("combobox", { name: "Vyberte měsíc" })
  if (pace === "normal" || (await yearSelect.inputValue()) !== String(year)) {
    await yearSelect.selectOption(String(year))
  }
  if (
    pace === "normal" ||
    (await monthSelect.evaluate((element) => (element as HTMLSelectElement).selectedIndex)) !==
      month! - 1
  ) {
    await monthSelect.selectOption({ index: month! - 1 })
  }
  await calendar.locator(`button[data-day="${day}. ${month}. ${year}"]`).click()
}

/** The value next to a label in a description list (`<dt>`/`<dd>`). */
export function definition(scope: Page | Frame | Locator, term: string) {
  return scope
    .locator("dt")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]")
}
