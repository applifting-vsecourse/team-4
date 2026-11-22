import { expect, test, type Page } from "@playwright/test"

import { newParticipant, register, setUpEvent, type TermSpec } from "./support/api"
import { addRoommateWish, closeDb, createMagicLink, decideTerms } from "./support/db"

// Správa akce → Ubytování → Rozdělení do pokojů (S4-02): the organizer
// publishes the rooms of a term, and its confirmed participants see their
// room and the state of their roommate wishes on the registration detail;
// taking the publication back hides them again.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka A", baseBeds: 2, terms: [0] }]

test.afterAll(closeDb)

const board = (page: Page) => page.getByRole("region", { name: "Uložené rozdělení" })

async function placeWithMenu(page: Page, person: string, room: string) {
  const unplaced = board(page).getByRole("region", { name: /^Bez pokoje/ })
  await unplaced.getByRole("button", { name: `Akce: ${person}` }).click()
  await page.getByRole("menuitem", { name: /^(Umístit|Přesunout) do pokoje$/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(`^${room}`) }).click()
  await expect(page.getByText("Umístění bylo uloženo.").first()).toBeVisible()
}

test("participants see their rooms only while the organizer publishes them", async ({
  browser,
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const jana = newParticipant("Jana")
  const eva = newParticipant("Eva")
  const janaId = (await register(page.request, event.publicId, jana, event.termIds)).id
  const evaId = (await register(page.request, event.publicId, eva, event.termIds)).id
  await decideTerms(janaId, "confirmed")
  await decideTerms(evaId, "confirmed")
  await addRoommateWish(janaId, evaId)

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/rooms`)
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  await placeWithMenu(page, "Jana Nováková", "Chatka A")
  await placeWithMenu(page, "Eva Nováková", "Chatka A")
  const toggle = board(page).getByRole("switch", { name: "Zveřejnit rozdělení" })
  await expect(toggle).not.toBeChecked()

  const participant = await browser.newContext()
  const portal = await participant.newPage()
  await portal.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await expect(portal.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await portal.goto(`/my-registrations/${janaId}`)
  const roomsCard = portal
    .locator('[data-slot="card"]')
    .filter({ has: portal.getByRole("heading", { name: "Rozdělení pokojů" }) })
  await expect(roomsCard.getByText("Rozdělení pokojů zatím není zveřejněné.")).toBeVisible()
  await expect(roomsCard.getByText("Chatka A")).toHaveCount(0)

  await toggle.click()
  await expect(page.getByText("Rozdělení je zveřejněné účastníkům.")).toBeVisible()
  await expect(toggle).toBeChecked()

  await portal.reload()
  await expect(roomsCard.getByText("Chatka A")).toBeVisible()
  const wish = roomsCard.getByRole("listitem").filter({ hasText: "Eva Nováková" })
  await expect(wish.getByText("Splněno")).toBeVisible()

  await toggle.click()
  await expect(page.getByText("Zveřejnění rozdělení je zrušené.")).toBeVisible()

  await portal.reload()
  await expect(roomsCard.getByText("Rozdělení pokojů zatím není zveřejněné.")).toBeVisible()
  await expect(roomsCard.getByText("Chatka A")).toHaveCount(0)
  await participant.close()
})
