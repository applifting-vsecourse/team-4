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
  await expect(page.getByRole("alert")).toContainText(
    "V ručním režimu vytvořte návrh tlačítkem Přepočítat",
  )

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

test("the organizer determines the accommodation from the order and the detail; a new answer cancels it", async ({
  page,
}) => {
  const event = await setUp(page)
  await page.goto(evaluationUrl(event))
  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(orderRow(page, "Alex")).toContainText("Ruční určení", { timeout: 20_000 })

  // From the order: Alex counts as Muž for every term, the answer stays.
  await page.getByRole("button", { name: /^Akce: Alex/ }).click()
  await page.getByRole("menuitem", { name: "Určit ubytování" }).click()
  const dialog = page.getByRole("dialog", { name: "Určit ubytování" })
  await expect(dialog).toContainText("Nechci uvést")
  await dialog.getByRole("button", { name: "Uložit určení" }).click()
  await expect(dialog.getByText("Uveďte důvod.")).toBeVisible()
  await dialog.getByRole("combobox").click()
  await page.getByRole("option", { name: "Muž" }).click()
  await dialog.getByLabel("Důvod").fill("Domluva s rodiči")
  await dialog.getByRole("button", { name: "Uložit určení" }).click()
  await expect(dialog).toBeHidden()

  // The term's inputs changed: the proposal is evaluated again on its own.
  await expect(orderRow(page, "Alex")).toContainText("Určeno: Muž", { timeout: 30_000 })
  await expect(orderRow(page, "Alex")).not.toContainText("Ruční určení", { timeout: 30_000 })
  await expect(page.getByRole("tab", { name: /Ruční určení/ })).toHaveCount(0)

  // The detail shows the determination and its record, without the F64 notice.
  await orderRow(page, "Alex").getByRole("link").click()
  await expect(page.getByText("Ubytovat jako", { exact: true })).toBeVisible()
  await expect(page.getByText("Muž, všechny termíny", { exact: true })).toBeVisible()
  await expect(page.getByText("Ubytování je potřeba určit ručně")).toBeHidden()
  const history = page
    .getByText("Historie vyhodnocení")
    .locator("xpath=ancestor::*[@data-slot='card'][1]")
  await expect(history).toContainText("Odpověď Nechci uvést → ubytovat jako Muž")
  await expect(history).toContainText("Důvod: Domluva s rodiči")

  // Changed from the detail: a second record.
  await page.getByRole("button", { name: "Změnit určení" }).click()
  const change = page.getByRole("dialog", { name: "Změnit určení ubytování" })
  await change.getByRole("combobox").click()
  await page.getByRole("option", { name: "Žena" }).click()
  await change.getByLabel("Důvod").fill("Oprava po hovoru")
  await change.getByRole("button", { name: "Uložit určení" }).click()
  await expect(page.getByText("Žena, všechny termíny", { exact: true })).toBeVisible()
  await expect(history.getByRole("listitem")).toHaveCount(2)

  // A corrected answer cancels it: the notice and "Určit ubytování" are back.
  await page.getByRole("button", { name: "Opravit" }).click()
  await page.getByRole("radio", { name: "Jiná odpověď" }).check()
  await page.getByRole("button", { name: "Uložit", exact: true }).click()
  await expect(page.getByText("Ubytování je potřeba určit ručně")).toBeVisible()
  await expect(page.getByRole("button", { name: "Určit ubytování" })).toBeVisible()
  await expect(history.getByRole("listitem")).toHaveCount(2)
  // The terms follow: the old place is not shown, the new evaluation needs a determination.
  const termsCard = page
    .getByText("Termíny", { exact: true })
    .locator("xpath=ancestor::*[@data-slot='card'][1]")
  await expect(termsCard).toContainText("Ruční určení", { timeout: 30_000 })
})

// S3-02: the organizer confirms the suitable of the current proposal at once,
// sees the others untouched, and decides one person on their own.
test("the organizer confirms the proposal of a term, then decides one person", async ({ page }) => {
  const event = await setUp(page)
  await page.goto(evaluationUrl(event))
  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 20_000 })

  // Before: the term, the count and the people in the batch.
  await page.getByRole("button", { name: "Potvrdit všechny vhodné (2)" }).click()
  const dialog = page.getByRole("dialog", { name: "Potvrdit všechny vhodné" })
  await expect(dialog).toContainText("1. turnus")
  await expect(dialog.getByRole("listitem")).toHaveText([/Tereza/, /Jana/])
  await dialog.getByRole("button", { name: "Potvrdit 2 účasti" }).click()
  await expect(page.getByText("Potvrzeno 2 účasti v termínu 1. turnus.")).toBeVisible()

  // The confirmed leave the order; the others stay as they were, in the other term too.
  await expect(orderRow(page, "Tereza")).toHaveCount(0)
  await expect(orderRow(page, "Petr")).toContainText("Čeká na rozhodnutí")
  await page.getByRole("tab", { name: "2. turnus" }).click()
  await expect(orderRow(page, "Tereza")).toContainText("Čeká na rozhodnutí")

  // One person: the room is full, so the decision is explained and nothing is saved.
  await page.getByRole("tab", { name: "1. turnus" }).click()
  await page.getByRole("button", { name: "Akce: Petr" }).click()
  await page.getByRole("menuitem", { name: "Potvrdit účast" }).click()
  const decision = page.getByRole("dialog", { name: "Potvrdit účast" })
  await decision.getByRole("button", { name: "Potvrdit účast" }).click()
  await expect(decision.getByText("Účast nebyla potvrzena", { exact: true })).toBeVisible()
  await decision.getByRole("button", { name: "Zavřít" }).click()
  await expect(orderRow(page, "Petr")).toContainText("Čeká na rozhodnutí")

  // Waitlisting needs no room and no value.
  await page.getByRole("button", { name: "Akce: Petr" }).click()
  await page.getByRole("menuitem", { name: "Zařadit mezi náhradníky" }).click()
  await page
    .getByRole("dialog", { name: "Zařadit mezi náhradníky" })
    .getByRole("button", { name: "Zařadit mezi náhradníky" })
    .click()
  await expect(orderRow(page, "Petr")).toContainText("Náhradník")

  // The history of the registration shows the decisions.
  await orderRow(page, "Petr").getByRole("link").click()
  await expect(page.getByText("Čeká na rozhodnutí → Náhradník")).toBeVisible()
})
