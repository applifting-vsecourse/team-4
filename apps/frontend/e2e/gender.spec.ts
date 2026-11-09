import { expect, test } from "@playwright/test"

import { newParticipant, register, setUpEvent, type TermSpec } from "./support/api"
import { closeDb, createMagicLink, setGenderHardAttribute } from "./support/db"
import { definition } from "./support/ui"

// The voluntary gender answer for accommodation (F64): chosen in the public
// form, shown to the participant and the organizer, changed by the participant
// through the registration edit and corrected by the organizer. With gender
// as the hard attribute, an answer that places nobody is decided by hand (S3-01).

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 4, terms: [0] }]
const ANSWER = "Pohlaví pro ubytování"
const OWN_WORDS = "Vlastní odpověď"

test.afterAll(closeDb)

test("the answer from the form is shown to both sides, changed and corrected", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setGenderHardAttribute(event.eventId)
  const jana = newParticipant("Jana")

  const context = await browser.newContext()
  const participant = await context.newPage()
  await participant.goto(`/e/${event.publicId}/registration`)
  await participant.getByRole("checkbox", { name: /1\. turnus/ }).check()
  await participant.getByLabel("Jméno").fill(jana.firstName)
  await participant.getByLabel("Příjmení").fill(jana.lastName)
  await participant.getByLabel("E-mail").fill(jana.email)
  await participant.getByLabel("Telefon").fill("+420 777 123 456")
  await participant.getByRole("radio", { name: "Nechci uvést" }).check()
  await participant.getByRole("button", { name: "Odeslat přihlášku" }).click()
  await expect(participant.getByRole("region", { name: "Přihláška je uložená" })).toBeVisible()

  await participant.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await participant
    .getByRole("link", { name: new RegExp(event.name) })
    .first()
    .click()
  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  await expect(definition(participant, ANSWER)).toHaveText("Nechci uvést")

  // The participant changes it; no approval threshold, so it is made at once.
  await participant.getByRole("link", { name: "Upravit přihlášku" }).click()
  await participant.getByRole("radio", { name: "Žena" }).check()
  await participant.getByRole("button", { name: "Zkontrolovat změny" }).click()
  const review = participant.getByRole("dialog", { name: "Kontrola změn přihlášky" })
  await expect(review).toContainText("Nechci uvést")
  await expect(review).toContainText("Žena")
  await review.getByRole("button", { name: "Potvrdit změnu" }).click()
  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  await participant.reload()
  await expect(definition(participant, ANSWER)).toHaveText("Žena")

  // The organizer sees the same answer and corrects it.
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/registrations`)
  await page
    .getByRole("link", { name: /Jana Nováková/ })
    .first()
    .click()
  await expect(definition(page, ANSWER)).toHaveText("Žena")
  await expect(page.getByText("Ubytování je potřeba určit ručně")).toBeHidden()

  await page.getByRole("button", { name: "Opravit" }).click()
  await page.getByRole("radio", { name: "Jiná odpověď" }).check()
  await page.getByRole("textbox", { name: "Vlastní odpověď" }).fill("nebinární")
  await page.getByRole("button", { name: "Uložit" }).click()
  await expect(definition(page, ANSWER)).toHaveText("Jiná odpověď")
  await expect(definition(page, OWN_WORDS)).toHaveText("nebinární")
  await expect(page.getByText("Ubytování je potřeba určit ručně")).toBeVisible()
  await page.reload()
  await expect(definition(page, ANSWER)).toHaveText("Jiná odpověď")
  await expect(definition(page, OWN_WORDS)).toHaveText("nebinární")

  await participant.reload()
  await expect(definition(participant, ANSWER)).toHaveText("Jiná odpověď")
  await expect(definition(participant, OWN_WORDS)).toHaveText("nebinární")
  await context.close()
})

test("the own words of Jiná odpověď are sent from the form and changed in the edit", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const context = await browser.newContext()
  const participant = await context.newPage()
  const eva = newParticipant("Eva")

  await participant.goto(`/e/${event.publicId}/registration`)
  await participant.getByRole("checkbox", { name: /1\. turnus/ }).check()
  await participant.getByLabel("Jméno").fill(eva.firstName)
  await participant.getByLabel("Příjmení").fill(eva.lastName)
  await participant.getByLabel("E-mail").fill(eva.email)
  await participant.getByLabel("Telefon").fill("+420 777 123 456")
  await participant.getByRole("radio", { name: "Jiná odpověď" }).check()
  await participant.getByRole("textbox", { name: "Vlastní odpověď" }).fill("nebinární")
  await participant.getByRole("button", { name: "Odeslat přihlášku" }).click()
  await expect(participant.getByRole("region", { name: "Přihláška je uložená" })).toBeVisible()

  await participant.goto(`/my-registrations/verify?token=${await createMagicLink(eva.email)}`)
  await participant
    .getByRole("link", { name: new RegExp(event.name) })
    .first()
    .click()
  await expect(definition(participant, OWN_WORDS)).toHaveText("nebinární")

  await participant.getByRole("link", { name: "Upravit přihlášku" }).click()
  const words = participant.getByRole("textbox", { name: "Vlastní odpověď" })
  await expect(words).toHaveValue("nebinární")
  await words.fill("agender")
  await participant.getByRole("button", { name: "Zkontrolovat změny" }).click()
  const review = participant.getByRole("dialog", { name: "Kontrola změn přihlášky" })
  await expect(review).toContainText("Vlastní odpověď")
  await expect(review).toContainText("agender")
  await review.getByRole("button", { name: "Potvrdit změnu" }).click()
  await expect(participant.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
  await participant.reload()
  await expect(definition(participant, OWN_WORDS)).toHaveText("agender")
  await context.close()
})

test("an older registration without an answer reads Neuvedeno, decided by hand", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setGenderHardAttribute(event.eventId)
  const registration = await register(
    page.request,
    event.publicId,
    newParticipant("Eva"),
    event.termIds,
  )

  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations/${registration.id}`,
  )
  await expect(definition(page, ANSWER)).toHaveText("Neuvedeno")
  await expect(page.getByText("Ubytování je potřeba určit ručně")).toBeVisible()
})

test("without a hard attribute nobody's accommodation is decided by hand", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const registration = await register(
    page.request,
    event.publicId,
    newParticipant("Eva"),
    event.termIds,
  )

  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations/${registration.id}`,
  )
  await expect(definition(page, ANSWER)).toHaveText("Neuvedeno")
  await expect(page.getByText("Ubytování je potřeba určit ručně")).toBeHidden()
})
