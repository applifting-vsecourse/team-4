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

const board = (page: Page) => page.getByRole("region", { name: "Uložené rozdělení" })

/** The term tabs of the proposal, the placements and the wishes (#26). */
const termTabs = (page: Page) => page.getByRole("tablist", { name: "Termín", exact: true })

const zone = (page: Page, title: string | RegExp) => {
  const name =
    typeof title === "string" && !title.startsWith("Bez pokoje") ? `Pokoj ${title}` : title
  return board(page).getByRole("region", { name })
}

const openRoom = async (page: Page, name: string) => {
  const room = zone(page, name)
  const trigger = room.getByRole("button").first()
  if ((await trigger.getAttribute("aria-expanded")) === "false") await trigger.click()
  return room
}

async function revealPerson(page: Page, person: string) {
  const action = board(page).getByRole("button", { name: `Akce: ${person}` })
  if (await action.isVisible()) return
  for (const roomName of ["Chatka A", "Chatka B"]) {
    const room = await openRoom(page, roomName)
    if (await room.getByRole("button", { name: `Akce: ${person}` }).isVisible()) return
  }
}

async function placeWithMenu(page: Page, person: string, room: string) {
  await revealPerson(page, person)
  await board(page)
    .getByRole("button", { name: `Akce: ${person}` })
    .click()
  await page.getByRole("menuitem", { name: /^(Umístit|Přesunout) do pokoje$/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(`^${room}`) }).click()
}

test("places confirmed participants, confirms a mixed room with a lock, unlocks and removes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 })
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
  const longParticipant = newParticipant("Alžběta Kristýna")
  longParticipant.lastName = "Nováková-Svobodová"
  longParticipant.email = `alzbeta-${Date.now()}@example.test`
  const longName = `${longParticipant.firstName} ${longParticipant.lastName}`
  const longPersonId = (
    await register(page.request, event.publicId, longParticipant, event.termIds, {
      gender: "female",
    })
  ).id
  await decideTerms(longPersonId, "confirmed")

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/rooms`)
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  await expect(page).toHaveURL(/tab=split/)
  const unplaced = zone(page, /^Bez pokoje/)
  await expect(unplaced.getByRole("heading", { name: "Bez pokoje (4)" })).toBeVisible()
  // Eva is not confirmed: no place on the board.
  await expect(board(page).getByText("Eva Nováková")).toHaveCount(0)

  await placeWithMenu(page, longName, "Chatka B")
  const chatkaB = await openRoom(page, "Chatka B")
  await expect(chatkaB.getByText(longName)).toBeVisible()
  await expect(chatkaB.getByRole("button", { name: `Akce: ${longName}` })).toBeVisible()
  await expect(
    chatkaB.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).resolves.toBe(true)
  await placeWithMenu(page, "Tereza Nováková", "Chatka A")
  await expect(page.getByText("Umístění bylo uloženo.").first()).toBeVisible()
  await placeWithMenu(page, "Jana Nováková", "Chatka A")
  await expect((await openRoom(page, "Chatka A")).getByText("2 / 2")).toBeVisible()

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
  await expect((await openRoom(page, "Chatka A")).getByText("Překročena kapacita")).toBeVisible()

  // Saved: a reload shows the same rooms and the lock.
  await page.reload()
  const chatkaA = await openRoom(page, "Chatka A")
  await expect(chatkaA.getByText("Petr Nováková")).toBeVisible()
  await expect(chatkaA.getByLabel("Zamčené umístění")).toHaveCount(1)
  await expect(
    zone(page, /^Bez pokoje \(0\)$/).getByRole("heading", { name: "Bez pokoje (0)" }),
  ).toBeVisible()

  // A locked placement only unlocks; then it can be removed.
  await revealPerson(page, "Petr Nováková")
  await board(page).getByRole("button", { name: "Akce: Petr Nováková" }).click()
  await expect(page.getByRole("menuitem", { name: "Odebrat z pokoje" })).toHaveCount(0)
  await page.getByRole("menuitem", { name: "Odemknout umístění" }).click()
  await expect(page.getByText("Umístění bylo odemčeno.")).toBeVisible()
  await expect(chatkaA.getByLabel("Zamčené umístění")).toHaveCount(0)
  await revealPerson(page, "Petr Nováková")
  await board(page).getByRole("button", { name: "Akce: Petr Nováková" }).click()
  await page.getByRole("menuitem", { name: "Odebrat z pokoje" }).click()
  await expect(zone(page, /^Bez pokoje/).getByText("Petr Nováková")).toBeVisible()
  await expect((await openRoom(page, "Chatka A")).getByText("2 / 2")).toBeVisible()

  // Each term has its own rooms; the selected one is kept in the URL.
  await termTabs(page).getByRole("tab", { name: "2. turnus" }).click()
  await expect(page).toHaveURL(new RegExp(`term=${event.termIds[1]}`))
  await expect(
    zone(page, /^Bez pokoje \(4\)$/).getByRole("heading", { name: "Bez pokoje (4)" }),
  ).toBeVisible()
  await page.reload()
  await expect(termTabs(page).getByRole("tab", { name: "2. turnus" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await page.getByRole("tab", { name: "Pokoje a kapacity" }).click()
  await expect(page).toHaveURL(new RegExp(`tab=rooms.*term=${event.termIds[1]}`))
  await expect(termTabs(page).getByRole("tab", { name: "2. turnus" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  await expect(termTabs(page).getByRole("tab", { name: "2. turnus" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`tab=rooms.*term=${event.termIds[1]}`))
  await page.goForward()
  await expect(page).toHaveURL(new RegExp(`tab=split.*term=${event.termIds[1]}`))
})
