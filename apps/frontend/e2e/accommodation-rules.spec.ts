import { expect, test, type Page } from "@playwright/test"

import {
  newParticipant,
  register,
  setEvaluationMode,
  setUpEvent,
  type TermSpec,
} from "./support/api"

// Správa akce → Ubytování → Rozdělení: rules are reviewed beside the saved
// room split; changing them refreshes the proposal and keeps the selected term.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
]
// One room of two beds: without the rule both fit, with it only one gender.
const rooms = [{ label: "Chatka", baseBeds: 2, terms: [0] }]

const orderRow = (page: Page, name: string) =>
  page.getByRole("tabpanel").getByRole("row").filter({ hasText: name }).first()

async function recalculate(page: Page) {
  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 20_000 })
}

test("splitting rooms by gender from the room split changes eligibility and proposal state", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  // Manual: the stale proposal stays shown until Přepočítat, however slow the run.
  await setEvaluationMode(page.request, event, "manual")
  for (const [name, gender] of [
    ["Tereza", "female"],
    ["Petr", "male"],
  ] as const) {
    await register(page.request, event.publicId, newParticipant(name), event.termIds, { gender })
  }

  // Without a rule only the beds count: both fit into the room.
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=evaluation`,
  )
  await recalculate(page)
  await expect(orderRow(page, "Tereza")).toContainText("Vhodný")
  await expect(orderRow(page, "Petr")).toContainText("Vhodný")

  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/rooms?tab=split&term=${event.termIds[0]}`,
  )
  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await proposal.getByRole("button", { name: "Upravit pravidla" }).click()
  const dialog = page.getByRole("dialog", { name: "Pravidla rozdělení" })
  const rules = dialog.locator('[data-slot="card"]').first()
  await expect(rules.getByRole("radio", { name: "Nedělit" })).toBeChecked()
  await rules.getByRole("radio", { name: "Pohlaví" }).check()
  await rules.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()
  await expect(rules.getByRole("radio", { name: "Pohlaví" })).toBeChecked()
  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[0]}`))

  // The previous proposal is stale; the new one keeps one gender in the room.
  await expect(proposal.getByText("Neaktuální návrh", { exact: true })).toBeVisible()
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=evaluation`,
  )
  await recalculate(page)
  await expect(orderRow(page, "Tereza")).toContainText("Vhodný")
  await expect(orderRow(page, "Petr")).toContainText("Neubytovatelný")
  await expect(page.getByRole("tab", { name: /^Muž/ })).toBeVisible()
})

// Nastavení → Návrh pokojů (#389): from Ubytování, the organizer ranks gender
// as a soft preference above "Přání" and keeps one neutral answer.
test("ranking the soft preferences of the room proposal from Ubytování", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })

  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/rooms?tab=split&term=${event.termIds[0]}`,
  )
  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await proposal.getByRole("button", { name: "Upravit pravidla" }).click()
  const dialog = page.getByRole("dialog", { name: "Pravidla rozdělení" })
  await expect(dialog.getByText("Nastavení platí pro všechny termíny akce.")).toBeVisible()
  const section = dialog.locator('[data-slot="card"]').nth(1)
  const items = section.getByRole("list").getByRole("listitem")
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText("Přání")

  await section.getByRole("button", { name: "Přidat preferenci" }).click()
  await section.getByRole("combobox", { name: "Nová preference" }).click()
  await page.getByRole("option", { name: "Pohlaví" }).click()
  await section.getByRole("button", { name: "Přidat" }).click()
  await section
    .getByRole("button", { name: "Přesunout Pohlaví" })
    .dragTo(items.first(), { targetPosition: { x: 24, y: 2 } })
  await expect(items.first()).toContainText("Pohlaví")
  await section.getByRole("checkbox", { name: "Jiná odpověď" }).uncheck()
  await section.getByRole("button", { name: "Uložit" }).click()
  await expect(section.getByRole("button", { name: "Uložit" })).toBeDisabled()

  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[0]}`))
  await page.reload()
  await page.getByRole("button", { name: "Upravit pravidla" }).click()
  const reloadedDialog = page.getByRole("dialog", { name: "Pravidla rozdělení" })
  const reloadedSection = reloadedDialog.locator('[data-slot="card"]').nth(1)
  await expect(reloadedSection.getByRole("listitem")).toHaveCount(2)
  await expect(reloadedSection.getByRole("listitem").first()).toContainText("Pohlaví")
  await expect(reloadedSection.getByRole("checkbox", { name: "Jiná odpověď" })).not.toBeChecked()
  await expect(reloadedSection.getByRole("checkbox", { name: "Nechci uvést" })).toBeChecked()

  // Gender as the hard attribute leaves the soft list.
  const rules = reloadedDialog.locator('[data-slot="card"]').first()
  await rules.getByRole("radio", { name: "Pohlaví" }).check()
  await rules.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()
  await expect(reloadedSection.getByRole("listitem")).toHaveCount(1)
  await expect(reloadedSection.getByRole("listitem").first()).toContainText("Přání")
})
