import { expect, test, type Page } from "@playwright/test"

import { newParticipant, register, setUpEvent, type OpenEvent, type TermSpec } from "./support/api"
import { closeDb, setGenderHardAttribute } from "./support/db"

// Přihlášky → Vyhodnocení (S3-01): the proposal of a term with its queues and
// order, recalculated on request in the manual mode and on its own after a
// change in the automatic mode, with the evidence of every run. Nothing here
// confirms anybody. Gender is the hard attribute through the rules stand-in.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-07-08", endDate: "2027-07-14", priceMinor: 100000 },
]
// Two beds in the first term: one room, so one gender only.
const rooms = [{ label: "Chatka", baseBeds: 2, terms: [0, 1] }]

test.afterAll(closeDb)

const evaluationUrl = (event: OpenEvent) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=evaluation`

const orderRow = (page: Page, name: string) =>
  page.getByRole("tabpanel").getByRole("row").filter({ hasText: name }).first()

async function setUp(page: Page) {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setGenderHardAttribute(event.eventId)
  for (const [name, gender] of [
    ["Tereza", "female"],
    ["Jana", "female"],
    ["Petr", "male"],
    ["Alex", "undisclosed"],
  ] as const) {
    await register(page.request, event.publicId, newParticipant(name), event.termIds, { gender })
  }
  return event
}

test("the manual mode evaluates a term only on request, with queues, reasons and the way back", async ({
  page,
}) => {
  const event = await setUp(page)

  // Nastavení → Automatizace: the manual mode is kept after a reload.
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/settings`)
  const automation = page.getByRole("region", { name: "Automatizace" })
  await automation.getByRole("radio", { name: "Přepočítat návrh jen tlačítkem Přepočítat" }).check()
  await automation.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Režim vyhodnocení byl uložen.")).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole("radio", { name: "Přepočítat návrh jen tlačítkem Přepočítat" }),
  ).toBeChecked()

  await page.goto(evaluationUrl(event))
  await expect(page.getByText("Termín zatím nebyl vyhodnocen")).toBeVisible()
  await expect(page.getByText("Aktualizuje se ručně")).toBeVisible()

  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 20_000 })

  // Two women fill the only room; the man has no free bed of his value, and
  // the undisclosed answer needs a manual determination.
  await expect(orderRow(page, "Tereza")).toContainText("Vhodný")
  await expect(orderRow(page, "Jana")).toContainText("Vhodný")
  await expect(orderRow(page, "Petr")).toContainText("Neubytovatelný")
  await expect(orderRow(page, "Alex")).toContainText("Ruční určení")
  await expect(page.getByRole("tab", { name: "Ruční určení (1)" })).toBeVisible()
  // Nobody is confirmed by the evaluation.
  await expect(orderRow(page, "Tereza")).toContainText("Čeká na rozhodnutí")

  // The queue of men, then a detail and back to the same term and queue.
  await page.getByRole("tab", { name: /^Muž/ }).click()
  await expect(page).toHaveURL(/queue=male/)
  await orderRow(page, "Petr").getByRole("link").click()
  await expect(page).toHaveURL(/fromQueue=male/)
  await page
    .getByRole("navigation", { name: /drobečk|breadcrumb/i })
    .getByRole("link", { name: "Přihlášky" })
    .click()
  await expect(page.getByRole("tab", { name: /^Muž/ })).toHaveAttribute("data-state", "active")
  await expect(page.getByRole("tab", { name: "1. turnus" })).toHaveAttribute("data-state", "active")

  // The run's evidence.
  await page.getByRole("button", { name: "Doklad" }).first().click()
  const evidence = page.getByRole("dialog", { name: "Doklad vyhodnocení" })
  await expect(evidence).toContainText("Chatka")
  await expect(evidence).toContainText("highs-phase1/1")
})

test("the automatic mode makes a changed proposal stale and evaluates it again on its own", async ({
  page,
}) => {
  const event = await setUp(page)
  await page.goto(evaluationUrl(event))
  await page.getByRole("tab", { name: "2. turnus" }).click()
  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 20_000 })

  await register(page.request, event.publicId, newParticipant("Eva"), [event.termIds[1]!], {
    gender: "female",
  })
  await page.reload()
  await expect(page.getByText("Neaktuální návrh", { exact: true })).toBeVisible()
  // About 10 s after the last change the term is evaluated again, by the system.
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(orderRow(page, "Eva")).toContainText("Neubytovatelný")
  await expect(page.getByText("Automaticky").first()).toBeVisible()
})
