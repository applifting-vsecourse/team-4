import { expect, test } from "@playwright/test"

import { newParticipant, register, setUpEvent, type TermSpec } from "./support/api"
import { definition } from "./support/ui"

// One bed, available in the first term only: a participant choosing both
// terms is confirmed in one and waitlisted in the other, and owes only for the
// confirmed one (S2-07, S2-08, S2-10, S2-16).

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-07-08", endDate: "2027-07-14", priceMinor: 200000 },
]
const rooms = [{ label: "Chatka", baseBeds: 1, terms: [0] }]

test("a participant picking two terms is confirmed in one and waitlisted in the other", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const participant = newParticipant("Anna")

  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/e/${event.publicId}`)
  await visitor.getByRole("checkbox", { name: /1\. turnus/ }).check()
  await visitor.getByRole("checkbox", { name: /2\. turnus/ }).check()
  await expect(visitor.getByRole("region", { name: "Cena vybraných termínů" })).toContainText(
    "3 000 Kč",
  )

  await visitor.getByLabel("Jméno").fill(participant.firstName)
  await visitor.getByLabel("Příjmení").fill(participant.lastName)
  await visitor.getByLabel("E-mail").fill(participant.email)
  await visitor.getByLabel("Telefon").fill("+420 777 123 456")
  await visitor.getByRole("button", { name: "Odeslat přihlášku" }).click()

  const result = visitor.getByRole("region", { name: "Přihláška je uložená" })
  const term = (label: string) => result.getByRole("listitem").filter({ hasText: label })
  await expect(term("1. turnus")).toContainText("Potvrzeno")
  await expect(term("2. turnus")).toContainText("Náhradník")
  await expect(definition(result, "Cena výběru")).toHaveText("3 000 Kč")
  await expect(definition(result, "K úhradě za potvrzené termíny")).toHaveText("1 000 Kč")

  await visitorContext.close()
})

test("occupancy counts each term by its own status", async ({ page, request }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await register(request, event.publicId, newParticipant("Anna"), event.termIds)

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/rooms`)
  const occupancy = page.getByRole("region", { name: "Obsazenost po termínech" })
  // Capacity, confirmed, free, waitlisted.
  await expect(occupancy.getByRole("row", { name: /1\. turnus .* 1 1 0 0$/ })).toBeVisible()
  await expect(occupancy.getByRole("row", { name: /2\. turnus .* 0 0 0 1$/ })).toBeVisible()
})
