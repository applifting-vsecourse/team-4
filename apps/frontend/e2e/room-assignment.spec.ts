import { expect, test, type Page } from "@playwright/test"

import {
  newParticipant,
  register,
  setHardAttribute,
  setUpEvent,
  type TermSpec,
} from "./support/api"
import { closeDb, decideTerms } from "./support/db"

// Správa akce → Ubytování → Rozdělení do pokojů (F14-2): the organizer
// places confirmed participants of a term into rooms, confirms an exception
// to a room's rules with a lock, unlocks and removes. Gender is the hard
// attribute; an unconfirmed participant has no place on the board.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-07-08", endDate: "2027-07-14", priceMinor: 100000 },
]
const rooms = [
  { label: "Chatka A", baseBeds: 2, terms: [0, 1] },
  { label: "Chatka B", baseBeds: 2, terms: [0, 1] },
]

test.afterAll(closeDb)

const board = (page: Page) => page.getByRole("region", { name: "Rozdělení do pokojů" })

const card = (page: Page, title: string | RegExp) =>
  board(page)
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name: title }) })

async function placeWithMenu(page: Page, person: string, room: string) {
  await board(page)
    .getByRole("button", { name: `Akce: ${person}` })
    .click()
  await page.getByRole("menuitem", { name: /^(Umístit|Přesunout) do pokoje$/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(`^${room}`) }).click()
}

test("places confirmed participants, confirms a mixed room with a lock, unlocks and removes", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setHardAttribute(page.request, event, "gender")
  for (const [name, gender, status] of [
    ["Tereza", "female", "confirmed"],
    ["Jana", "female", "confirmed"],
    ["Petr", "male", "confirmed"],
    ["Eva", "female", null],
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
    if (status) await decideTerms(id, status)
  }

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/rooms`)
  const unplaced = card(page, /^Bez pokoje/)
  await expect(unplaced.getByRole("heading", { name: "Bez pokoje (3)" })).toBeVisible()
  // Eva is not confirmed: no place on the board.
  await expect(board(page).getByText("Eva Nováková")).toHaveCount(0)

  await placeWithMenu(page, "Tereza Nováková", "Chatka A")
  await expect(page.getByText("Umístění bylo uloženo.").first()).toBeVisible()
  await placeWithMenu(page, "Jana Nováková", "Chatka A")
  await expect(card(page, "Chatka A").getByText("2 / 2")).toBeVisible()

  // A man into the full room of women: mixed and over capacity.
  await placeWithMenu(page, "Petr Nováková", "Chatka A")
  const dialog = page.getByRole("dialog", { name: "Umístit do pokoje Chatka A" })
  await expect(
    dialog.getByText("Pokoj bude smíšený podle pravidla Pohlaví: Žena, Muž."),
  ).toBeVisible()
  await expect(dialog.getByText("Pokoj překročí kapacitu lůžek a přistýlek.")).toBeVisible()
  await dialog.getByRole("checkbox", { name: "Zamknout umístění" }).check()
  await dialog.getByRole("button", { name: "Umístit i přesto" }).click()
  await expect(dialog).toBeHidden()
  await expect(card(page, "Chatka A").getByText("Překročena kapacita")).toBeVisible()

  // Saved: a reload shows the same rooms and the lock.
  await page.reload()
  const chatkaA = card(page, "Chatka A")
  await expect(chatkaA.getByText("Petr Nováková")).toBeVisible()
  await expect(chatkaA.getByLabel("Zamčené umístění")).toHaveCount(1)
  await expect(
    card(page, /^Bez pokoje/).getByRole("heading", { name: "Bez pokoje (0)" }),
  ).toBeVisible()

  // A locked placement only unlocks; then it can be removed.
  await board(page).getByRole("button", { name: "Akce: Petr Nováková" }).click()
  await expect(page.getByRole("menuitem", { name: "Odebrat z pokoje" })).toHaveCount(0)
  await page.getByRole("menuitem", { name: "Odemknout umístění" }).click()
  await expect(page.getByText("Umístění bylo odemčeno.")).toBeVisible()
  await expect(chatkaA.getByLabel("Zamčené umístění")).toHaveCount(0)
  await board(page).getByRole("button", { name: "Akce: Petr Nováková" }).click()
  await page.getByRole("menuitem", { name: "Odebrat z pokoje" }).click()
  await expect(card(page, /^Bez pokoje/).getByText("Petr Nováková")).toBeVisible()
  await expect(chatkaA.getByText("2 / 2")).toBeVisible()

  // Each term has its own rooms; the selected one is kept in the URL.
  await board(page).getByRole("tab", { name: "2. turnus" }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[1]}`))
  await expect(
    card(page, /^Bez pokoje/).getByRole("heading", { name: "Bez pokoje (3)" }),
  ).toBeVisible()
  await page.reload()
  await expect(board(page).getByRole("tab", { name: "2. turnus" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
})
