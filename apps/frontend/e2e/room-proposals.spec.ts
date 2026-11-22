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
import { addRoommateWish, closeDb } from "./support/db"

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

test.afterAll(closeDb)

async function confirmed(
  page: Page,
  event: OpenEvent,
  name: string,
  gender: "female" | "male",
): Promise<string> {
  const { id } = await register(
    page.request,
    event.publicId,
    newParticipant(name),
    [event.termIds[0]!],
    { gender },
  )
  await confirm(page.request, event, event.termIds[0]!, id)
  return id
}

test("proposing rooms by hand, stale after a change, and automatically", async ({ page }) => {
  // Two solver runs and the 10 s debounce of the automatic one.
  test.slow()
  const event = await setUpEvent(page.request, { terms, rooms })
  await setHardAttribute(page.request, event, "gender")
  await confirmed(page, event, "Tereza", "female")
  await confirmed(page, event, "Jana", "female")
  await confirmed(page, event, "Petr", "male")

  // A new event proposes only on request.
  await page.goto(roomsUrl(event))
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await expect(proposal.getByText("Návrh zatím nevznikl.")).toBeVisible()
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
  await expect(page).toHaveURL(/view=proposal/)
  await page.getByRole("button", { name: "Zpět na uložené rozdělení" }).click()
  await expect(page).toHaveURL(/view=assignment/)
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[0]}`))
  await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
  await expect(page).toHaveURL(/view=proposal/)
  await page.reload()
  await expect(page).toHaveURL(/view=proposal/)
  await expect(
    page.getByRole("tablist", { name: "Termín", exact: true }).getByRole("tab", {
      name: /1\. turnus/,
    }),
  ).toHaveAttribute("aria-selected", "true")
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Zpět na uložené rozdělení" }).click()
  await expect(page).toHaveURL(/view=assignment/)
  await page.goBack()
  await expect(page).toHaveURL(/view=proposal/)
  await page.goForward()
  await expect(page).toHaveURL(/view=assignment/)
  await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
  // Gender splits rooms: the women share Chatka A, the man has the other.
  const roomOf = (name: string) => proposal.getByRole("row").filter({ hasText: name }).first()
  await expect(roomOf("Tereza")).toContainText("Jana")
  await expect(roomOf("Petr")).not.toContainText("Tereza")

  // The other term is in the URL and has no proposal yet.
  await page
    .getByRole("tablist", { name: "Termín", exact: true })
    .getByRole("tab", { name: /2\. turnus/ })
    .click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[1]}`))
  await expect(page).toHaveURL(/view=proposal/)
  await expect(proposal.getByText("Termín zatím nemá návrh pokojů")).toBeVisible()
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
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 45_000,
  })
  await expect(roomOf("Lucie")).toBeVisible()
})

test("applying a proposal saves its rooms, and the wishes follow the saved rooms", async ({
  page,
}) => {
  test.setTimeout(90_000)
  const event = await setUpEvent(page.request, { terms, rooms })
  await setHardAttribute(page.request, event, "gender")
  const tereza = await confirmed(page, event, "Tereza", "female")
  const jana = await confirmed(page, event, "Jana", "female")
  const petr = await confirmed(page, event, "Petr", "male")
  await addRoommateWish(jana, tereza)
  await addRoommateWish(petr, tereza)

  await page.goto(roomsUrl(event))
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  const wishes = page.getByRole("region", { name: "Přání na spolubydlící" })
  const wishOf = (name: string) => wishes.getByRole("row").filter({ hasText: name })
  /** "Uložené rozdělení" of the wish from `name`. */
  const savedStateOf = (name: string) => wishOf(name).getByRole("cell").nth(2)
  // Nobody has a saved room yet; a man and a woman can't share one.
  await expect(wishOf("Jana")).toContainText("Čeká na umístění")
  await expect(wishOf("Petr")).toContainText("Nelze splnit")

  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
  await proposal.getByRole("button", { name: "Použít návrh" }).click()
  const dialog = page.getByRole("dialog", { name: "Použít návrh pokojů" })
  await expect(dialog.getByText("Nová umístění (3)")).toBeVisible()
  await dialog.getByRole("button", { name: "Použít návrh" }).click()
  await expect(page.getByText("Návrh pokojů byl použit.")).toBeVisible()

  // Saved: the board has everyone in a room, Jana with Tereza, and the
  // proposal reads as applied while nothing changes.
  const board = page.getByRole("region", { name: "Uložené rozdělení" })
  for (const room of ["Chatka A", "Chatka B"]) {
    const roomRegion = board.getByRole("region", { name: `Pokoj ${room}` })
    if ((await roomRegion.getByRole("button").first().getAttribute("aria-expanded")) === "false") {
      await roomRegion.getByRole("button").first().click()
    }
  }
  const roomOf = (person: string) =>
    board
      .getByRole("region", { name: /^Pokoj/ })
      .filter({ hasText: person })
      .first()
  await expect(roomOf("Jana")).toContainText("Tereza")
  // The saved column, not the proposal's, which said so before the apply.
  await expect(savedStateOf("Jana")).toHaveText("Splněno")
  await expect(proposal.getByText("Použitý návrh", { exact: true })).toBeVisible()
  await expect(proposal.getByRole("button", { name: "Použít návrh" })).toHaveCount(0)

  // A manual change is read live too, and the proposal is out of date then.
  if (
    (await roomOf("Jana").getByRole("button", { name: "Akce: Jana Nováková" }).isVisible()) ===
    false
  ) {
    await roomOf("Jana").getByRole("button").first().click()
  }
  await board.getByRole("button", { name: /^Akce: Jana/ }).click()
  await page.getByRole("menuitem", { name: "Odebrat z pokoje" }).click()
  await expect(savedStateOf("Jana")).toHaveText("Čeká na umístění")
  await expect(proposal.getByText("Neaktuální návrh", { exact: true })).toBeVisible()
})

test("a server refusal leaves the proposal unsaved and offers a retry", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setHardAttribute(page.request, event, "gender")
  await confirmed(page, event, "Jana", "female")

  await page.goto(roomsUrl(event))
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  const proposal = page.getByRole("region", { name: "Návrh pokojů" })
  await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
  await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
  await expect(page).toHaveURL(/view=proposal/)

  await page.route(`**/terms/${event.termIds[0]}/room-proposal/apply`, (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        code: "proposal_stale",
        message: "Návrh pokojů je neaktuální, nic se neuložilo",
      }),
    }),
  )
  await proposal.getByRole("button", { name: "Použít návrh" }).click()
  const dialog = page.getByRole("dialog", { name: "Použít návrh pokojů" })
  await dialog.getByRole("button", { name: "Použít návrh" }).click()
  await expect(dialog.getByText("Návrh pokojů je neaktuální, nic se neuložilo")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Navrhnout pokoje" })).toBeVisible()
  await dialog.getByRole("button", { name: "Zavřít" }).click()
  await page.getByRole("button", { name: "Zpět na uložené rozdělení" }).click()
  const board = page.getByRole("region", { name: "Uložené rozdělení" })
  await expect(board.getByRole("region", { name: "Bez pokoje (1)" })).toContainText("Jana Nováková")
})
