import { expect, test, type Page } from "@playwright/test"

import { newParticipant, register, setUpEvent, type OpenEvent } from "./support/api"
import { definition } from "./support/ui"

// Payments beyond the debt (S2-12) and the list catching up with a payment
// recorded in the detail (S2-11).

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", bedCount: 1, terms: [0] }]

const registrationsUrl = (event: OpenEvent) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/registrations`

async function recordPayment(page: Page, amount: string) {
  await page.getByRole("button", { name: "Zaznamenat platbu" }).click()
  const dialog = page.getByRole("dialog", { name: "Zaznamenat platbu" })
  await dialog.getByLabel("Přijatá částka (Kč)").fill(amount)
  await dialog.getByRole("button", { name: "Uložit platbu" }).click()
  await expect(dialog).toBeHidden()
}

test("an overpayment shows as Přeplatek in the detail and, without a reload, in the list", async ({
  page,
  request,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const anna = newParticipant("Anna")
  await register(request, event.publicId, anna, event.termIds)

  // The list is loaded before the payment, so it has to catch up afterwards.
  await page.goto(registrationsUrl(event))
  const row = page.getByRole("row", { name: new RegExp(anna.firstName) })
  await expect(row).toContainText("Nezaplaceno")
  await page
    .getByRole("link", { name: `Otevřít přihlášku ${anna.firstName} ${anna.lastName}` })
    .click()

  await recordPayment(page, "1200")
  await expect(definition(page, "Přeplatek")).toHaveText("200 Kč")

  await page.getByRole("link", { name: "Přihlášky" }).first().click()
  await expect(row).toContainText("Přeplatek")
})

test("a payment without an obligation is an overpayment", async ({ page, request }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await register(request, event.publicId, newParticipant("Anna"), event.termIds)
  // The only bed is taken: Petr is waitlisted and owes nothing.
  const petr = await register(request, event.publicId, newParticipant("Petr"), event.termIds)

  await page.goto(`${registrationsUrl(event)}/${petr.id}`)
  await recordPayment(page, "500")
  await expect(definition(page, "Přeplatek")).toHaveText("500 Kč")
})
