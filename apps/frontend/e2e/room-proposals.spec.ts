import { expect, test, type Page } from "@playwright/test"

import {
  confirm,
  newParticipant,
  register,
  setHardAttribute,
  setUpEvent,
  type OpenEvent,
  type TermSpec,
} from "./support/api"

// Ubytování → Návrh pokojů (#385) and Nastavení → Automatizace: the organizer
// proposes rooms for the confirmed participants of a term. The proposal
// changes no saved placement or participation, goes stale when the term
// changes and, with automatic proposals on, is made again by itself.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [
  // Room for every woman of the test; gender keeps Petr out of it.
  { label: "Chatka A", baseBeds: 4, terms: [0, 1] },
  { label: "Chatka B", baseBeds: 2, terms: [0, 1] },
]

const roomsUrl = (event: OpenEvent) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/rooms`

async function confirmed(
  page: Page,
  event: OpenEvent,
  name: string,
  gender: "female" | "male",
): Promise<void> {
  const { id } = await register(
    page.request,
    event.publicId,
    newParticipant(name),
    [event.termIds[0]!],
    { gender },
  )
  await confirm(page.request, event, event.termIds[0]!, id)
}

test("proposing rooms by hand, stale after a change, and automatically", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setHardAttribute(page.request, event, "gender")
  await confirmed(page, event, "Tereza", "female")
  await confirmed(page, event, "Jana", "female")
  await confirmed(page, event, "Petr", "male")

  // A new event proposes only on request.
  await page.goto(roomsUrl(event))
  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await expect(proposal.getByText("Vytvořte návrh tlačítkem Navrhnout pokoje.")).toBeVisible()
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  // Gender splits rooms: the women share Chatka A, the man has the other.
  const roomOf = (name: string) => proposal.getByRole("row").filter({ hasText: name }).first()
  await expect(roomOf("Tereza")).toContainText("Jana")
  await expect(roomOf("Petr")).not.toContainText("Tereza")

  // The other term is in the URL and has no proposal yet.
  await proposal.getByRole("tab", { name: /2\. turnus/ }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[1]}`))
  await expect(proposal.getByText("Vytvořte návrh tlačítkem Navrhnout pokoje.")).toBeVisible()
  await page.goBack()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible()

  // A new confirmation makes the proposal stale; nothing is proposed by itself.
  await confirmed(page, event, "Eva", "female")
  await page.reload()
  await expect(proposal.getByText("Neaktuální návrh", { exact: true })).toBeVisible()

  // Nastavení → Automatizace: automatic room proposals, beside the evaluation mode.
  await page.locator('a[href$="/settings#room-proposal-settings-heading"]').click()
  const automation = page.getByRole("region", { name: "Automatizace" })
  const automatic = automation.getByRole("radio", {
    name: "Navrhovat pokoje automaticky po každé změně",
  })
  await automatic.check()
  await automation
    .locator('[data-slot="card"]')
    .filter({
      has: page.getByRole("radio", { name: "Navrhovat pokoje automaticky po každé změně" }),
    })
    .getByRole("button", { name: "Uložit" })
    .click()
  await expect(page.getByText("Režim návrhu pokojů byl uložen.")).toBeVisible()

  // The next change is proposed again about 10 s later, without a request.
  await confirmed(page, event, "Lucie", "female")
  await page.goto(roomsUrl(event))
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 45_000,
  })
  await expect(roomOf("Lucie")).toBeVisible()
})
