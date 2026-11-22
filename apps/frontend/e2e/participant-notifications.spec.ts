import { expect, test } from "@playwright/test"

import {
  newParticipant,
  recordPayment,
  register,
  setChangeApprovalDays,
  setUpEvent,
} from "./support/api"
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

test("an approved change notification waits for its request before scrolling", async ({
  browser,
}) => {
  const organizerContext = await browser.newContext()
  const organizerPage = await organizerContext.newPage()
  const event = await setUpEvent(organizerPage.request, {
    terms: [
      { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 300000 },
    ],
  })
  await setChangeApprovalDays(organizerPage.request, event, 365)

  const jana = newParticipant("Jana")
  const { id: registrationId } = await register(
    organizerPage.request,
    event.publicId,
    jana,
    event.termIds,
  )

  const participantContext = await browser.newContext()
  const participant = await participantContext.newPage()
  await participant.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await expect(participant.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await participant.goto(`/my-registrations/${registrationId}`)
  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  await participant.getByRole("link", { name: "Spravovat přihlášku" }).click()
  await participant.getByLabel("Telefon").fill("+420 731 987 654")
  await participant.getByRole("button", { name: "Zkontrolovat změny" }).click()
  await participant
    .getByRole("dialog", { name: "Kontrola změn přihlášky" })
    .getByRole("button", { name: "Odeslat žádost o schválení" })
    .click()
  await expect(participant.getByText("Čeká na schválení")).toBeVisible()

  await organizerPage.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=approvals`,
  )
  await expect(organizerPage.getByRole("tab", { name: /Ke schválení/ })).toHaveAttribute(
    "data-state",
    "active",
  )
  await organizerPage.getByRole("link", { name: "Přihláška Jana Nováková" }).click()
  await organizerPage.getByRole("button", { name: "Schválit" }).click()
  await expect(organizerPage.getByText(/– schváleno$/)).toBeVisible()

  let isChangesLoaded = false
  await participant.route(
    `**/participant/registrations/${registrationId}/changes`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900))
      isChangesLoaded = true
      await route.continue()
    },
  )
  await participant.goto("/my-notifications")
  const notification = participant.getByRole("link", { name: "Žádost o změnu schválena" })
  await expect(notification).toBeVisible()
  const href = await notification.getAttribute("href")
  if (!href) throw new Error("Notification link has no destination")
  const targetId = new URL(href, "http://localhost").hash.slice(1)
  await notification.click()
  await expect(participant).toHaveURL(new RegExp(`#${targetId}$`))
  await expect.poll(() => isChangesLoaded).toBe(true)
  const target = participant.locator(`[id="${targetId}"]`)
  await expect(target).toBeVisible()
  await expect(target).toBeInViewport()
  await expect(participant.locator("#zadosti-o-zmenu").locator("xpath=..")).toHaveAttribute(
    "data-state",
    "open",
  )

  // The same hash also resolves after a direct reload with a fresh query cache.
  isChangesLoaded = false
  await participant.reload()
  await expect.poll(() => isChangesLoaded).toBe(true)
  await expect(target).toBeVisible()
  await expect(target).toBeInViewport()
  await participantContext.close()
  await organizerContext.close()
})
