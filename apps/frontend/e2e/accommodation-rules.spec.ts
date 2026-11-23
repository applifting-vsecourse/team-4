import { expect, test, type Page } from "@playwright/test"

import {
  confirm,
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
  { label: "2. turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
// One room of two beds: without the rule both fit, with it only one gender.
const rooms = [{ label: "Chatka", baseBeds: 2, terms: [0, 1] }]

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
  const registrations: string[] = []
  for (const [name, gender] of [
    ["Tereza", "female"],
    ["Petr", "male"],
  ] as const) {
    const { id } = await register(
      page.request,
      event.publicId,
      newParticipant(name),
      event.termIds,
      {
        gender,
      },
    )
    registrations.push(id)
  }

  // Without a rule only the beds count: both fit into the room.
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=evaluation`,
  )
  await recalculate(page)
  await expect(orderRow(page, "Tereza")).toContainText("Vhodný")
  await expect(orderRow(page, "Petr")).toContainText("Vhodný")

  // Keep term 1 pending for the eligibility check; confirm the same pair only
  // in term 2 so the solver has participants to propose rooms for.
  for (const registrationId of registrations) {
    await confirm(page.request, event, event.termIds[1]!, registrationId)
  }
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/rooms?tab=split&term=${event.termIds[1]}`,
  )
  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page).toHaveURL(/view=proposal/)
  await page.getByRole("button", { name: "Zpět na uložené rozdělení" }).click()
  await expect(page).toHaveURL(/view=assignment/)
  await proposal.getByRole("button", { name: "Upravit pravidla" }).click()
  const dialog = page.getByRole("dialog", { name: "Pravidla rozdělení" })
  const rules = dialog.locator('[data-slot="card"]').first()
  const splitBy = rules.getByRole("combobox", { name: "Pokoje dělit podle" })
  await expect(splitBy).toContainText("Bez rozdělení")
  await splitBy.click()
  await page.getByRole("option", { name: "Pohlaví pro ubytování" }).click()
  await rules.getByRole("button", { name: "Uložit pravidlo" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()
  await expect(splitBy).toContainText("Pohlaví pro ubytování")
  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[1]}`))

  // The previous proposal is stale; the new one keeps one gender in the room.
  await expect(proposal.getByText("Neaktuální návrh", { exact: true })).toBeVisible()
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=evaluation&evaluationTerm=${event.termIds[0]}`,
  )
  await expect(page.getByRole("tab", { name: "1. turnus", selected: true })).toBeVisible()
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
  await page.getByRole("menuitem", { name: "Pohlaví" }).click()
  await section
    .getByRole("button", { name: "Přesunout Pohlaví" })
    .dragTo(items.first(), { targetPosition: { x: 24, y: 2 } })
  await expect(items.first()).toContainText("Pohlaví")
  await section.getByRole("button", { name: /Ignorované odpovědi/ }).click()
  await section.getByRole("checkbox", { name: "Jiná odpověď" }).uncheck()
  await section.getByRole("button", { name: "Uložit preference" }).click()
  await expect(section.getByRole("button", { name: "Uložit preference" })).toBeDisabled()

  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[0]}`))
  await page.reload()
  await page.getByRole("button", { name: "Upravit pravidla" }).click()
  const reloadedDialog = page.getByRole("dialog", { name: "Pravidla rozdělení" })
  const reloadedSection = reloadedDialog.locator('[data-slot="card"]').nth(1)
  await expect(reloadedSection.getByRole("listitem")).toHaveCount(2)
  await expect(reloadedSection.getByRole("listitem").first()).toContainText("Pohlaví")
  await reloadedSection.getByRole("button", { name: /Ignorované odpovědi/ }).click()
  await expect(reloadedSection.getByRole("checkbox", { name: "Jiná odpověď" })).not.toBeChecked()
  await expect(reloadedSection.getByRole("checkbox", { name: "Nechci uvést" })).toBeChecked()

  // Gender as the hard attribute leaves the soft list.
  const rules = reloadedDialog.locator('[data-slot="card"]').first()
  const splitBy = rules.getByRole("combobox", { name: "Pokoje dělit podle" })
  await splitBy.click()
  await page.getByRole("option", { name: "Pohlaví pro ubytování" }).click()
  await rules.getByRole("button", { name: "Uložit pravidlo" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()
  await expect(reloadedSection.getByRole("listitem")).toHaveCount(1)
  await expect(reloadedSection.getByRole("listitem").first()).toContainText("Přání")
})
