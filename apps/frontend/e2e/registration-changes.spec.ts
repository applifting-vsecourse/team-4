import { expect, test, type Browser, type Page } from "@playwright/test"

import {
  newParticipant,
  register,
  setChangeApprovalDays,
  setUpEvent,
  type OpenEvent,
  type TermSpec,
} from "./support/api"
import { closeDb, createMagicLink, decideTerms } from "./support/db"

// Changing an own registration (F35-2a): a move outside the organizer's
// approval threshold is made at once; a change touching a term inside it
// becomes a request that the organizer approves or rejects.

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

// Turnus 1 starts inside the 14-day threshold, the others outside it.
const terms: TermSpec[] = [
  { label: "Turnus 1", startDate: inDays(5), endDate: inDays(7), priceMinor: 100000 },
  { label: "Turnus 2", startDate: inDays(60), endDate: inDays(62), priceMinor: 100000 },
  { label: "Turnus 3", startDate: inDays(90), endDate: inDays(92), priceMinor: 150000 },
]
const rooms = [{ label: "Chatka", baseBeds: 5, terms: [0, 1, 2] }]

test.afterAll(closeDb)

/** Jana is confirmed in Turnus 1 and 2; the participant page is logged in. */
async function setUp(browser: Browser, organizerPage: Page) {
  const event = await setUpEvent(organizerPage.request, { terms, rooms })
  await setChangeApprovalDays(organizerPage.request, event, 14)
  const jana = newParticipant("Jana")
  const registration = await register(
    organizerPage.request,
    event.publicId,
    jana,
    event.termIds.slice(0, 2),
  )
  await decideTerms(registration.id, "confirmed")

  const context = await browser.newContext()
  const participant = await context.newPage()
  await participant.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await expect(participant.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await participant.goto(`/my-registrations/${registration.id}`)
  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  return { event, registration, participant, context }
}

const termRow = (page: Page, label: string) =>
  page.getByRole("listitem").filter({ hasText: new RegExp(`^${label}`) })

async function openOrganizerRequest(page: Page, event: OpenEvent, registrationId: string) {
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=approvals`,
  )
  await expect(page.getByRole("tab", { name: /Ke schválení/ })).toHaveAttribute(
    "data-state",
    "active",
  )
  await page.getByRole("link", { name: "Otevřít žádost Jana Nováková" }).click()
  await expect(page).toHaveURL(new RegExp(registrationId))
}

test("a move outside the approval threshold is made at once", async ({ page, browser }) => {
  const { event, participant, context } = await setUp(browser, page)

  await participant.getByRole("link", { name: "Upravit přihlášku" }).click()
  await participant.getByRole("combobox").nth(1).click()
  await participant.getByRole("option", { name: /Turnus 3/ }).click()
  await participant.getByRole("button", { name: "Zkontrolovat změny" }).click()

  const review = participant.getByRole("dialog", { name: "Kontrola změn přihlášky" })
  await expect(
    review.getByText("Storno poplatek a případnou vratku řeší organizátor"),
  ).toBeVisible()
  // The new term waits for the organizer, so the confirmed place needs consent (S3-01).
  await expect(review.getByText(/O účasti v termínu Turnus 3 rozhodne organizátor/)).toBeVisible()
  await expect(review.getByRole("button", { name: "Potvrdit změnu" })).toBeDisabled()
  await review.getByRole("checkbox", { name: /Souhlasím/ }).check()
  await review.getByRole("button", { name: "Potvrdit změnu" }).click()

  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  await expect(termRow(participant, "Turnus 2")).toContainText("Odhlášeno")
  await expect(termRow(participant, "Turnus 3")).toContainText("Čeká na rozhodnutí organizátora")
  await expect(termRow(participant, "Turnus 1")).toContainText("Potvrzeno")
  await expect(participant.getByText("Historie změn")).toBeVisible()
  await context.close()
})

test("a change inside the threshold waits for the organizer, who approves it", async ({
  page,
  browser,
}) => {
  const { event, registration, participant, context } = await setUp(browser, page)

  await participant.getByRole("link", { name: "Upravit přihlášku" }).click()
  await participant.getByLabel("Telefon").fill("+420 731 987 654")
  await participant.getByRole("button", { name: "Zkontrolovat změny" }).click()
  const review = participant.getByRole("dialog", { name: "Kontrola změn přihlášky" })
  await expect(review.getByText("Změnu musí schválit organizátor")).toBeVisible()
  await review.getByRole("button", { name: "Odeslat žádost o schválení" }).click()

  await expect(participant.getByText("Čeká na schválení")).toBeVisible()
  // Nothing changes before the decision, and no further change is offered.
  await expect(participant.getByRole("link", { name: "Upravit přihlášku" })).toBeHidden()

  await openOrganizerRequest(page, event, registration.id)
  await expect(page.getByText("+420731987654")).toBeVisible()
  await expect(page.getByText("+420777123456").first()).toBeVisible()
  await page.getByRole("button", { name: "Schválit" }).click()
  // A decided request is history only, never shown as an open request.
  await expect(page.getByText(/– schváleno$/)).toBeVisible()
  await expect(page.getByRole("heading", { name: "Žádost o změnu" })).toBeHidden()

  await participant.reload()
  await expect(participant.getByText("Schváleno").first()).toBeVisible()
  await expect(participant.getByRole("link", { name: "Upravit přihlášku" })).toBeVisible()
  await context.close()
})

test("a rejected request leaves the registration as it was", async ({ page, browser }) => {
  const { event, registration, participant, context } = await setUp(browser, page)

  await participant.getByRole("button", { name: "Odhlásit se z akce" }).click()
  const review = participant.getByRole("dialog", { name: "Odhlášení" })
  await review.getByRole("button", { name: "Odeslat žádost o schválení" }).click()
  await expect(participant.getByText("Čeká na schválení")).toBeVisible()

  await openOrganizerRequest(page, event, registration.id)
  await page.getByRole("button", { name: "Zamítnout" }).click()
  await expect(page.getByText(/– zamítnuto$/)).toBeVisible()
  await expect(page.getByRole("heading", { name: "Žádost o změnu" })).toBeHidden()

  await participant.reload()
  await expect(participant.getByText("Zamítnuto").first()).toBeVisible()
  await expect(termRow(participant, "Turnus 1")).toContainText("Potvrzeno")
  await expect(termRow(participant, "Turnus 2")).toContainText("Potvrzeno")
  await context.close()
})

test("without a request the queue is empty", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=approvals`,
  )
  await expect(page.getByText("Žádné změny nečekají na schválení.")).toBeVisible()
})
