import { expect, test } from "@playwright/test"

import { newParticipant, register, setUpEvent, type TermSpec } from "./support/api"
import { decideTerms } from "./support/db"
import { definition } from "./support/ui"

// A participant choosing two terms waits for the organizer in both and owes
// nothing (S3-01). Once decided, each term has its own status and only the
// confirmed one is owed (S2-10, S2-16).

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-07-08", endDate: "2027-07-14", priceMinor: 200000 },
]
const rooms = [{ label: "Chatka", baseBeds: 1, terms: [0] }]

test("a participant picking two terms waits in both, owing nothing until a decision", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const participant = newParticipant("Anna")

  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/e/${event.publicId}/registration`)
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
  await expect(term("1. turnus")).toContainText("Čeká na rozhodnutí organizátora")
  await expect(term("2. turnus")).toContainText("Čeká na rozhodnutí organizátora")
  await expect(definition(result, "Cena výběru")).toHaveText("3 000 Kč")
  await expect(result.getByText("Nyní nemáte platební povinnost.")).toBeVisible()
  await expect(result.getByRole("img", { name: "QR kód s odkazem na platbu" })).toHaveCount(0)

  await visitorContext.close()
})

test("occupancy counts each term by its own status", async ({ page, request }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const registration = await register(
    request,
    event.publicId,
    newParticipant("Anna"),
    event.termIds,
  )
  await decideTerms(registration.id, "confirmed", event.termIds.slice(0, 1))
  await decideTerms(registration.id, "waitlisted", event.termIds.slice(1, 2))

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/rooms`)
  const occupancy = page.getByRole("region", { name: "Obsazenost po termínech" })
  // Capacity, confirmed, free, waitlisted.
  await expect(occupancy.getByRole("row", { name: /1\. turnus .* 1 1 0 0$/ })).toBeVisible()
  await expect(occupancy.getByRole("row", { name: /2\. turnus .* 0 0 0 1$/ })).toBeVisible()
})
