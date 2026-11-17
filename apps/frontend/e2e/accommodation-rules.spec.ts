import { expect, test, type Page } from "@playwright/test"

import {
  newParticipant,
  register,
  setEvaluationMode,
  setUpEvent,
  type TermSpec,
} from "./support/api"

// Nastavení → Pravidla ubytování (#384): the organizer chooses that rooms are
// split by gender, from the "Nastavení" of Přihlášky; the evaluation then
// stops mixing a woman and a man in one room.

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

test("splitting rooms by gender from the settings changes who is suitable", async ({ page }) => {
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

  // The context "Nastavení" opens the event settings at the accommodation rules.
  await page.locator('a[href$="/settings#accommodation-rules-heading"]').click()
  const rules = page.getByRole("region", { name: "Pravidla ubytování" })
  await expect(rules.getByRole("radio", { name: "Nedělit" })).toBeChecked()
  await rules.getByRole("radio", { name: "Pohlaví" }).check()
  await rules.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()
  await page.reload()
  await expect(rules.getByRole("radio", { name: "Pohlaví" })).toBeChecked()

  // The previous proposal is stale; the new one keeps one gender in the room.
  await page.goBack()
  await expect(page.getByText("Neaktuální návrh", { exact: true })).toBeVisible()
  await recalculate(page)
  await expect(orderRow(page, "Tereza")).toContainText("Vhodný")
  await expect(orderRow(page, "Petr")).toContainText("Neubytovatelný")
  await expect(page.getByRole("tab", { name: /^Muž/ })).toBeVisible()
})

// Nastavení → Návrh pokojů (#389): from Ubytování, the organizer ranks gender
// as a soft preference above "Přání" and keeps one neutral answer.
test("ranking the soft preferences of the room proposal from Ubytování", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/rooms`)
  await page.locator('a[href$="/settings#room-proposal-settings-heading"]').click()
  const section = page.getByRole("region", { name: "Návrh pokojů" })
  const items = section.getByRole("list").getByRole("listitem")
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText("Přání")

  await section.getByRole("combobox", { name: "Přidat preferenci" }).click()
  await page.getByRole("option", { name: "Pohlaví" }).click()
  await section.getByRole("button", { name: "Přidat" }).click()
  await section.getByRole("button", { name: "Posunout Pohlaví výš" }).click()
  await section.getByRole("checkbox", { name: "Jiná odpověď" }).uncheck()
  await section.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Preference návrhu pokojů byly uloženy.")).toBeVisible()

  await page.reload()
  await expect(items).toHaveCount(2)
  await expect(items.first()).toContainText("Pohlaví")
  await expect(section.getByRole("checkbox", { name: "Jiná odpověď" })).not.toBeChecked()
  await expect(section.getByRole("checkbox", { name: "Nechci uvést" })).toBeChecked()

  // Gender as the hard attribute leaves the soft list.
  const rules = page.getByRole("region", { name: "Pravidla ubytování" })
  await rules.getByRole("radio", { name: "Pohlaví" }).check()
  await rules.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText("Přání")
})
