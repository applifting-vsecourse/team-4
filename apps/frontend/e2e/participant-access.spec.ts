import { expect, test, type Browser } from "@playwright/test"

import { newParticipant, recordPayment, register, setUpEvent } from "./support/api"
import { closeDb, createMagicLink } from "./support/db"
import { definition } from "./support/ui"

// The participant's own view after a magic link (S2-13, S2-14), showing what
// the organizer recorded. The link is created in the database: no e-mail is
// sent or read.

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", bedCount: 1, terms: [0] }]
const REFUSED = "Odkaz už není platný: byl použit, vypršel nebo není správný. Vyžádejte si nový."

test.afterAll(closeDb)

/** Jana is confirmed for 1 000 Kč and the organizer has recorded 400 Kč. */
async function janaWithPayment(browser: Browser) {
  const organizerContext = await browser.newContext()
  const organizer = organizerContext.request
  const event = await setUpEvent(organizer, { terms, rooms })
  const jana = newParticipant("Jana")
  const registration = await register(organizer, event.publicId, jana, event.termIds)
  await recordPayment(organizer, event, registration.id, 40000)
  await organizerContext.close()
  return { event, jana }
}

const verifyUrl = (token: string) => `/my-registrations/verify?token=${token}`

test("the participant sees the payment the organizer recorded", async ({ browser, page }) => {
  const { event, jana } = await janaWithPayment(browser)

  await page.goto(verifyUrl(await createMagicLink(jana.email)))
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await page.getByRole("link", { name: `Detail přihlášky ${event.name}` }).click()

  await expect(page.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  await expect(page.getByRole("listitem").filter({ hasText: "400 Kč" })).toBeVisible()
  await expect(definition(page, "Zbývá zaplatit")).toHaveText("600 Kč")
})

test("a link works only once", async ({ browser, page }) => {
  const { jana } = await janaWithPayment(browser)
  const url = verifyUrl(await createMagicLink(jana.email))

  await page.goto(url)
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()

  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  await other.goto(url)
  await expect(other.getByText(REFUSED)).toBeVisible()
  await otherContext.close()
})

test("an expired link is refused", async ({ browser, page }) => {
  const { jana } = await janaWithPayment(browser)
  const token = await createMagicLink(jana.email, { expiresAt: new Date(Date.now() - 60_000) })

  await page.goto(verifyUrl(token))
  await expect(page.getByText(REFUSED)).toBeVisible()
})

test("after logging out the detail URL shows nothing private", async ({ browser, page }) => {
  const { event, jana } = await janaWithPayment(browser)

  await page.goto(verifyUrl(await createMagicLink(jana.email)))
  await page.getByRole("link", { name: `Detail přihlášky ${event.name}` }).click()
  await expect(page.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  const detailUrl = page.url()

  const logout = page.getByRole("button", { name: "Odhlásit se" })
  await logout.click()
  // The logout request must finish before the next navigation could cancel it.
  await expect(logout).toBeHidden()
  await page.goto(detailUrl)
  await expect(page.getByRole("button", { name: "Poslat přihlašovací odkaz" })).toBeVisible()
  await expect(page.getByText(event.name)).toBeHidden()
  await expect(page.getByText("400 Kč")).toBeHidden()
})
