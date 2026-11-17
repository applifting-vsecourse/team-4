import { expect, test, type Page } from "@playwright/test"

import { newParticipant, register, setUpEvent, type OpenEvent } from "./support/api"
import { decideTerms } from "./support/db"
import { definition } from "./support/ui"

// Payments beyond the debt (S2-12) and the list catching up with a payment
// recorded in the detail (S2-11).

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 1, terms: [0] }]

const registrationsUrl = (event: OpenEvent) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/registrations`

async function recordPayment(page: Page, amount: string) {
  await page.getByRole("button", { name: "Zaznamenat platbu" }).click()
  const dialog = page.getByRole("dialog", { name: "Zaznamenat platbu" })
  await dialog.getByLabel("Přijatá částka (Kč)").fill(amount)
  await dialog.getByRole("button", { name: "Uložit platbu" }).click()
  await expect(dialog).toBeHidden()
}

// One event for the whole money path: every event with registrations adds an
// accommodation evaluation to the worker's queue that later specs wait on.
test("an overpayment shows as Přeplatek in the detail and, without a reload, in the list and Platby", async ({
  page,
  request,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const anna = newParticipant("Anna")
  const registration = await register(request, event.publicId, anna, event.termIds)
  await decideTerms(registration.id, "confirmed")
  const annaLink = `Přihláška ${anna.firstName} ${anna.lastName}`

  // Nothing received yet (S4-09): the whole price is due and the import is offered.
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/payments`)
  const balance = page
    .getByRole("region", { name: "Tabulka sald přihlášek" })
    .getByRole("row", { name: new RegExp(anna.firstName) })
  await expect(balance).toContainText("Nezaplaceno")
  await expect(page.getByText("Zatím žádné přijaté platby")).toBeVisible()

  // The list and the overview are loaded before the payment, so they have to catch up afterwards.
  await page.goto(registrationsUrl(event))
  const row = page.getByRole("row", { name: new RegExp(anna.firstName) })
  await expect(row).toContainText("Nezaplaceno")
  await page.getByRole("link", { name: annaLink }).click()

  await recordPayment(page, "1200")
  await expect(definition(page, "Přeplatek")).toHaveText("200 Kč")

  await page.getByRole("link", { name: "Přihlášky" }).first().click()
  await expect(row).toContainText("Přeplatek")

  await page
    .getByRole("navigation", { name: "Navigace organizace a akce" })
    .getByRole("link", { name: "Platby" })
    .click()
  await expect(balance).toHaveText(/[-−]\s*200\s*Kč$/)
  const payments = page.getByRole("region", { name: "Tabulka přijatých plateb" })
  await expect(payments.getByRole("row", { name: new RegExp(anna.firstName) })).toContainText(
    "1 200 Kč",
  )
  // A payment opens its registration.
  await payments.getByRole("link", { name: annaLink }).click()
  await expect(page).toHaveURL(new RegExp(`/registrations/${registration.id}$`))
})

test("a payment without an obligation is an overpayment", async ({ page, request }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  // Petr waits for the organizer's decision and owes nothing (S3-01).
  const petr = await register(request, event.publicId, newParticipant("Petr"), event.termIds)

  await page.goto(`${registrationsUrl(event)}/${petr.id}`)
  await recordPayment(page, "500")
  await expect(definition(page, "Přeplatek")).toHaveText("500 Kč")
})
