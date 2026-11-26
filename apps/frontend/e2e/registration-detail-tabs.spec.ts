import { expect, test } from "@playwright/test"

import { newParticipant, register, setUpEvent, type TermSpec } from "./support/api"
import { closeDb } from "./support/db"

// The organizer's registration detail in tabs (F38-1): the selection lives in
// the URL, an unfinished edit survives a switch of the tab, and a payment
// recorded in Platby updates the summary above the tabs.

const terms: TermSpec[] = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 2, terms: [0] }]

test.afterAll(closeDb)

test("tabs are restored from the URL, keep an unfinished edit and update the summary", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const registration = await register(
    page.request,
    event.publicId,
    newParticipant("Jana"),
    event.termIds,
  )
  const detail = `/organizations/${event.organizationId}/events/${event.eventId}/registrations/${registration.id}`

  // Without a target, and with an unknown one, the personal data open.
  await page.goto(detail)
  await expect(page.getByRole("tab", { name: "Osobní údaje", selected: true })).toBeVisible()
  await page.goto(`${detail}?tab=neexistuje`)
  await expect(page.getByRole("tab", { name: "Osobní údaje", selected: true })).toBeVisible()

  // A direct link opens its tab; Back and Forward restore the selection.
  await page.goto(`${detail}?tab=needs`)
  await expect(page.getByRole("tab", { name: "Potřeby", selected: true })).toBeVisible()
  await page.getByRole("tab", { name: "Platby" }).click()
  await expect(page).toHaveURL(/tab=payments/)
  await page.goBack()
  await expect(page.getByRole("tab", { name: "Potřeby", selected: true })).toBeVisible()
  await page.goForward()
  await page.reload()
  await expect(page.getByRole("tab", { name: "Platby", selected: true })).toBeVisible()

  // An unfinished edit stays while another tab is shown.
  await page.getByRole("tab", { name: "Potřeby" }).click()
  await page.getByRole("button", { name: "Upravit" }).click()
  await page.getByLabel("Zdravotní omezení").fill("Alergie na pyl")
  await page.getByRole("tab", { name: "Historie" }).click()
  await page.getByRole("tab", { name: "Potřeby" }).click()
  await expect(page.getByLabel("Zdravotní omezení")).toHaveValue("Alergie na pyl")
  await page.getByRole("button", { name: "Zrušit" }).click()

  // A payment is recorded in Platby, the summary above every tab follows.
  await page.getByRole("tab", { name: "Platby" }).click()
  await page.getByRole("button", { name: "Zaznamenat platbu" }).click()
  const dialog = page.getByRole("dialog", { name: "Zaznamenat platbu" })
  await dialog.getByLabel("Přijatá částka (Kč)").fill("400")
  await dialog.getByRole("button", { name: "Uložit platbu" }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole("tab", { name: "Osobní údaje" }).click()
  // Nothing is confirmed yet, so the whole payment is an overpayment.
  await expect(page.getByText("Přeplatek", { exact: true }).first()).toBeVisible()
})
