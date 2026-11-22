import { expect, test } from "@playwright/test"

import { setUpEvent, type TermSpec } from "./support/api"
import { closeDb } from "./support/db"

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]

test.afterAll(closeDb)

test("adds the first room and restores the selected tab and term from the URL", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  const event = await setUpEvent(page.request, { terms })
  const eventRooms = `/organizations/${event.organizationId}/events/${event.eventId}/rooms`

  await page.goto(`${eventRooms}?tab=rooms&term=${event.termIds[1]}`)
  await expect(page.getByRole("tab", { name: "Pokoje a kapacity" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
  const addRoom = page.getByRole("button", { name: "Přidat pokoj" })
  await expect(addRoom).toBeVisible()
  await expect(page.getByRole("tab", { name: "Obsazenost" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Rozdělení" })).toBeVisible()

  await addRoom.click()
  const dialog = page.getByRole("dialog", { name: "Nový pokoj" })
  await dialog.getByLabel("Označení").fill("Chatka první")
  const firstTerm = dialog.getByRole("group", { name: /1\. turnus/ })
  await firstTerm.getByLabel("Základní lůžka").fill("0")
  await firstTerm.getByLabel("Přistýlky").fill("0")
  const term = dialog.getByRole("group", { name: /2\. turnus/ })
  await term.getByLabel("Základní lůžka").fill("3")
  await term.getByLabel("Přistýlky").fill("0")
  await dialog.getByRole("button", { name: "Uložit" }).click()

  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole("row", { name: /Chatka první/ })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`tab=rooms.*term=${event.termIds[1]}`))

  await page.getByRole("tab", { name: "Obsazenost" }).click()
  await expect(page.getByRole("row", { name: /2\. turnus/ })).toContainText("3")
  await page.getByRole("tab", { name: "Rozdělení" }).click()
  await expect(page).toHaveURL(new RegExp(`tab=split.*term=${event.termIds[1]}`))
  await expect(page.getByRole("tab", { name: "2. turnus" })).toHaveAttribute(
    "aria-selected",
    "true",
  )

  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`tab=occupancy.*term=${event.termIds[1]}`))
  await page.goForward()
  await expect(page).toHaveURL(new RegExp(`tab=split.*term=${event.termIds[1]}`))
  await page.reload()
  await expect(page.getByRole("tab", { name: "Rozdělení" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await expect(page.getByRole("tab", { name: "2. turnus" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
})
