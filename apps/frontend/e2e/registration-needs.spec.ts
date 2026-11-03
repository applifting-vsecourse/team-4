import { expect, test, type Browser, type Page } from "@playwright/test"

import { API_URL, newParticipant, setUpEvent, type OpenEvent, type TermSpec } from "./support/api"
import { closeDb, createMagicLink } from "./support/db"

// Transport, diet and health (F63): entered once in the public form, read by
// the participant and the organizer, corrected by the organizer, changed by
// the participant through F35-2a, and never exposed on a public surface.

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

const terms: TermSpec[] = [
  { label: "Turnus 1", startDate: inDays(60), endDate: inDays(62), priceMinor: 100000 },
  { label: "Turnus 2", startDate: inDays(90), endDate: inDays(92), priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 5, terms: [0, 1] }]

const HEALTH = "Astma, s sebou inhalátor."

test.afterAll(closeDb)

const needsCard = (page: Page) =>
  page.locator("[data-slot=card]").filter({ hasText: "Doprava, strava a zdraví" })

/** Jana registers through the public form for both terms, with her needs. */
async function registerWithNeeds(page: Page, event: OpenEvent) {
  const jana = newParticipant("Jana")
  await page.goto(`/e/${event.publicId}`)
  await page.getByRole("checkbox", { name: /Turnus 1/ }).check()
  await page.getByRole("checkbox", { name: /Turnus 2/ }).check()
  await page.getByLabel("Jméno").fill(jana.firstName)
  await page.getByLabel("Příjmení").fill(jana.lastName)
  await page.getByLabel("E-mail").fill(jana.email)
  await page.getByLabel("Telefon").fill("+420 777 123 456")
  await page.getByRole("radio", { name: "Společná doprava" }).check()
  await page.getByLabel("Poznámka k dopravě").fill("Nastupujeme v Pardubicích.")
  await page.getByRole("checkbox", { name: "Vegetariánská" }).check()
  await page.getByRole("checkbox", { name: "Bezlaktózová" }).check()
  await page.getByLabel("Vlastní text ke stravě").fill("Bez ořechů.")
  await page.getByLabel("Zdravotní omezení").fill(HEALTH)
  await page.getByRole("button", { name: "Odeslat přihlášku" }).click()
  await expect(page.getByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
  // The public result carries none of it.
  await expect(page.getByText(HEALTH)).toBeHidden()
  return jana
}

async function openOwnDetail(browser: Browser, email: string, eventName: string) {
  const context = await browser.newContext()
  const participant = await context.newPage()
  await participant.goto(`/my-registrations/verify?token=${await createMagicLink(email)}`)
  await expect(participant.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await participant
    .getByRole("link", { name: new RegExp(eventName) })
    .first()
    .click()
  await expect(participant.getByRole("heading", { name: eventName, level: 1 })).toBeVisible()
  return { participant, context }
}

async function openOrganizerDetail(page: Page, event: OpenEvent) {
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/registrations`)
  await page
    .getByRole("link", { name: /Jana Nováková/ })
    .first()
    .click()
  await expect(page.getByRole("heading", { name: "Jana Nováková", level: 1 })).toBeVisible()
}

test("the needs entered in the form reach the participant and the organizer, who corrects them", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const visitorContext = await browser.newContext()
  const jana = await registerWithNeeds(await visitorContext.newPage(), event)
  await visitorContext.close()

  const { participant, context } = await openOwnDetail(browser, jana.email, event.name)
  const own = needsCard(participant)
  await expect(own.getByText("Společná doprava")).toBeVisible()
  await expect(own.getByText("Nastupujeme v Pardubicích.")).toBeVisible()
  await expect(own.getByText("Vegetariánská")).toBeVisible()
  await expect(own.getByText("Bezlaktózová")).toBeVisible()
  await expect(own.getByText("Bez ořechů.")).toBeVisible()
  await expect(own.getByText(HEALTH)).toBeVisible()

  await openOrganizerDetail(page, event)
  const managed = needsCard(page)
  await expect(managed.getByText(HEALTH)).toBeVisible()
  await managed.getByRole("button", { name: "Upravit" }).click()
  await page.getByRole("button", { name: "Zrušit výběr" }).click()
  await page.getByLabel("Poznámka k dopravě").fill("")
  await page.getByLabel("Zdravotní omezení").fill("Astma, inhalátor má u sebe vedoucí.")
  await page.getByRole("button", { name: "Uložit údaje" }).click()

  await expect(managed.getByRole("button", { name: "Upravit" })).toBeVisible()
  await expect(managed.getByText("Astma, inhalátor má u sebe vedoucí.")).toBeVisible()
  // The cleared transport reads "Neuvedeno"; the diet stays as it was.
  await expect(managed.getByText("Neuvedeno")).toBeVisible()
  await expect(managed.getByText("Vegetariánská")).toBeVisible()
  await page.reload()
  await expect(needsCard(page).getByText("Astma, inhalátor má u sebe vedoucí.")).toBeVisible()

  await participant.reload()
  await expect(own.getByText("Astma, inhalátor má u sebe vedoucí.")).toBeVisible()
  await expect(own.getByText("Společná doprava")).toBeHidden()

  // No public surface exposes them.
  const publicDetail = await page.request.get(`${API_URL}/public/events/${event.publicId}`)
  expect(await publicDetail.text()).not.toContain("inhalátor")
  await context.close()
})

test("the participant changes the needs through the registration change", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const visitorContext = await browser.newContext()
  const jana = await registerWithNeeds(await visitorContext.newPage(), event)
  await visitorContext.close()
  const { participant, context } = await openOwnDetail(browser, jana.email, event.name)

  await participant.getByRole("link", { name: "Upravit přihlášku" }).click()
  await participant.getByRole("checkbox", { name: "Bez omezení" }).check()
  await expect(participant.getByRole("checkbox", { name: "Vegetariánská" })).not.toBeChecked()
  await participant.getByLabel("Vlastní text ke stravě").fill("")
  await participant.getByLabel("Zdravotní omezení").fill("")
  await participant.getByRole("button", { name: "Zkontrolovat změny" }).click()

  const review = participant.getByRole("dialog", { name: "Kontrola změn přihlášky" })
  await expect(review.getByRole("cell", { name: "Strava" })).toBeVisible()
  await expect(review.getByRole("cell", { name: "Bez omezení" })).toBeVisible()
  await review.getByRole("button", { name: "Potvrdit změnu" }).click()

  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  const own = needsCard(participant)
  await expect(own.getByText("Bez omezení")).toBeVisible()
  await expect(own.getByText("Vegetariánská")).toBeHidden()
  // An emptied health field is "Neuvedeno", not a confirmation of no limits.
  await expect(own.getByText("Neuvedeno")).toBeVisible()

  await openOrganizerDetail(page, event)
  await expect(needsCard(page).getByText("Bez omezení")).toBeVisible()
  await context.close()
})
