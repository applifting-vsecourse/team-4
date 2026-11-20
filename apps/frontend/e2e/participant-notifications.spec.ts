import { expect, test } from "@playwright/test"

import { newParticipant, recordPayment, register, setUpEvent } from "./support/api"
import { closeDb, createMagicLink } from "./support/db"

// Oznámení (S4-06): a payment the organizer records becomes a notification of
// the participant's own registration only. The account menu shows it as
// unread until it is opened; opening it lands on Přijaté platby; the cross
// hides it for good.

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 300000 },
]

test.afterAll(closeDb)

test("a recorded payment is a notification the participant opens and hides", async ({
  browser,
  page,
}) => {
  const organizerContext = await browser.newContext()
  const event = await setUpEvent(organizerContext.request, { terms })
  const jana = newParticipant("Jana")
  const olga = newParticipant("Olga")
  const { id: registrationId } = await register(
    organizerContext.request,
    event.publicId,
    jana,
    event.termIds,
  )
  await register(organizerContext.request, event.publicId, olga, event.termIds)
  await recordPayment(organizerContext.request, event, registrationId, 150000)
  await organizerContext.close()

  await page.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()

  // Unread: the user icon says so, and so does Oznámení in the menu.
  const account = page.getByRole("banner").getByRole("button", { name: "Účet", exact: true })
  await expect(account).toHaveAccessibleDescription("Máte nepřečtená oznámení")
  await account.click()
  await page.getByRole("menuitem", { name: "Oznámení (nepřečtená)" }).click()

  await expect(page.getByRole("heading", { name: "Oznámení", level: 1 })).toBeVisible()
  const main = page.getByRole("main")
  await expect(main.getByText(event.name)).toBeVisible()
  await expect(main.getByText(/1\s500\s*Kč/)).toBeVisible()

  // Opening it lands on the received payments and marks it read.
  await main.getByRole("link", { name: "Nepřečteno: Přijatá platba" }).click()
  await expect(page).toHaveURL(new RegExp(`/my-registrations/${registrationId}#prijate-platby$`))
  await expect(page.locator("#prijate-platby")).toBeInViewport()

  await page.goto("/my-notifications")
  await expect(main.getByRole("link", { name: "Přijatá platba", exact: true })).toBeVisible()
  await expect(account).not.toHaveAccessibleDescription("Máte nepřečtená oznámení")

  // The cross hides it for good.
  await main.getByRole("button", { name: `Skrýt oznámení Přijatá platba, ${event.name}` }).click()
  await expect(main.getByText("Zatím nemáte žádná oznámení")).toBeVisible()
  await page.reload()
  await expect(main.getByText("Zatím nemáte žádná oznámení")).toBeVisible()

  // Another participant of the same event never sees it.
  const olgaContext = await browser.newContext()
  const olgaPage = await olgaContext.newPage()
  await olgaPage.goto(`/my-registrations/verify?token=${await createMagicLink(olga.email)}`)
  await expect(olgaPage.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await olgaPage.goto("/my-notifications")
  await expect(olgaPage.getByRole("main").getByText("Zatím nemáte žádná oznámení")).toBeVisible()
  await olgaContext.close()
})
