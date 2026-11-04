import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test"

import {
  API_URL,
  createOrganization,
  newParticipant,
  register,
  setUpEvent,
  signUpOrganizer,
  type OpenEvent,
} from "./support/api"
import { closeDb, createMagicLink } from "./support/db"
import { pickDate } from "./support/ui"

// Programme of a term (F65): the organizer's editing, what a confirmed
// participant reads, failures that keep the saved state, and the doors that
// stay closed. Magic links are created in the database; no e-mail is sent.

const terms = [
  { label: "Turnus 1", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
  { label: "Turnus 2", startDate: "2027-08-15", endDate: "2027-08-21", priceMinor: 120000 },
]
const rooms = [{ label: "Chatka", baseBeds: 1, terms: [0, 1] }]

const origin = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3050").origin
const writeHeaders = { Origin: origin }

const DINNER = { title: "Společná večeře", startDate: "2027-08-02", startTime: "19:00" }
const BREAKFAST = { title: "Snídaně", startDate: "2027-08-03", startTime: "08:30" }

test.afterAll(closeDb)

const programmeUrl = (event: OpenEvent, termIndex: number) =>
  `${API_URL}/organizations/${event.organizationId}/events/${event.eventId}/terms/${event.termIds[termIndex]}/programme`

async function addItem(
  request: APIRequestContext,
  event: OpenEvent,
  termIndex: number,
  item: { title: string; startDate: string; startTime: string },
) {
  const response = await request.post(programmeUrl(event, termIndex), {
    data: { ...item, place: null, description: null },
    headers: writeHeaders,
  })
  expect(response.status()).toBe(201)
}

const termProgrammePage = (event: OpenEvent, termIndex: number) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/terms/${event.termIds[termIndex]}/programme`

/** Opens a magic link for `email` and the first registration in the list. */
async function signIn(page: Page, event: OpenEvent, email: string) {
  await page.goto(`/my-registrations/verify?token=${await createMagicLink(email)}`)
  await page.getByRole("link", { name: `Detail přihlášky ${event.name}` }).click()
  await expect(page.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
}

/** Jana is confirmed for Turnus 1, Bea (same term, one bed) is waitlisted. */
async function eventWithTwoParticipants(page: Page, browser: Browser) {
  const event = await setUpEvent(page.request, { terms, rooms })
  const publicContext = await browser.newContext()
  const jana = newParticipant("Jana")
  const bea = newParticipant("Bea")
  const janaRegistration = await register(publicContext.request, event.publicId, jana, [
    event.termIds[0]!,
  ])
  const beaRegistration = await register(publicContext.request, event.publicId, bea, [
    event.termIds[0]!,
  ])
  await publicContext.close()
  return { event, jana, bea, janaRegistration, beaRegistration }
}

test("the organizer edits a term's programme and the confirmed participant reads it, changing nothing else", async ({
  page,
  browser,
}) => {
  const { event, jana, janaRegistration } = await eventWithTwoParticipants(page, browser)
  const eventPath = `${API_URL}/organizations/${event.organizationId}/events/${event.eventId}`
  const snapshot = async () => ({
    rooms: (await (await page.request.get(`${eventPath}/rooms`)).json()) as unknown,
    registration: (await (
      await page.request.get(`${eventPath}/registrations/${janaRegistration.id}`)
    ).json()) as unknown,
    // The item count is the one thing a programme change is meant to move.
    terms: ((await (await page.request.get(eventPath)).json()) as { terms: object[] }).terms.map(
      (term) => ({ ...term, programmeItemCount: undefined }),
    ),
  })
  const before = await snapshot()

  // Entry from the existing term settings, no new navigation branch.
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/settings`)
  await expect(page.getByRole("row", { name: /Turnus 1/ })).toContainText("Bez položek")
  await page.getByRole("link", { name: "Program termínu Turnus 1" }).click()
  await expect(page.getByRole("heading", { name: "Program – Turnus 1", level: 1 })).toBeVisible()
  await expect(page.getByText("Program zatím nemá žádné položky")).toBeVisible()

  // Add: required fields are explained at the fields and nothing is saved.
  await page.getByRole("button", { name: "Přidat položku" }).click()
  const dialog = page.locator('[data-slot="dialog-content"]')
  await dialog.getByLabel("Název").fill("Společná večeře")
  await dialog.getByRole("button", { name: "Uložit položku" }).click()
  await expect(dialog.getByText("Vyberte platné datum.")).toBeVisible()
  await expect(dialog.getByText("Zadejte čas začátku.")).toBeVisible()
  await expect(dialog.getByLabel("Název")).toHaveValue("Společná večeře")

  // A day outside the term is refused with the term's range.
  await pickDate(page, dialog.getByLabel("Datum"), "2027-08-10")
  await dialog.getByLabel(/Začátek/).fill("19:00")
  await dialog.getByRole("button", { name: "Uložit položku" }).click()
  await expect(dialog.getByText(/Datum musí být v rozsahu termínu/)).toBeVisible()

  await pickDate(page, dialog.getByLabel("Datum"), "2027-08-02")
  await dialog.getByLabel("Místo (nepovinné)").fill("Jídelna")
  await dialog.getByRole("button", { name: "Uložit položku" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole("heading", { name: /Pondělí 2\. 8\. 2027/ })).toBeVisible()
  await expect(page.getByText("Společná večeře")).toBeVisible()

  // A second item on an earlier day is listed first, by day.
  await addItem(page.request, event, 0, BREAKFAST)
  await addItem(page.request, event, 0, {
    title: "Příjezd",
    startDate: "2027-08-01",
    startTime: "15:00",
  })
  await page.reload()
  const days = page.getByRole("heading", { level: 3 })
  await expect(days).toHaveText(["Neděle 1. 8. 2027", "Pondělí 2. 8. 2027", "Úterý 3. 8. 2027"])

  // Edit, then the saved state survives a reload.
  await page.getByRole("button", { name: "Upravit položku Společná večeře" }).click()
  await dialog.getByLabel("Název").fill("Slavnostní večeře")
  await dialog.getByRole("button", { name: "Uložit položku" }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await expect(page.getByText("Slavnostní večeře")).toBeVisible()
  await expect(page.getByText("Společná večeře")).toBeHidden()

  // The confirmed participant reads it at the next load, with the term named.
  const participantContext = await browser.newContext()
  const participant = await participantContext.newPage()
  await signIn(participant, event, jana.email)
  await expect(participant.getByRole("heading", { name: "Program – Turnus 1" })).toBeVisible()
  await expect(participant.getByText("Slavnostní večeře")).toBeVisible()
  await expect(participant.getByText("19:00")).toBeVisible()
  await expect(participant.getByText("8:30")).toBeVisible()
  // They can only read: no editing or booking controls.
  await expect(participant.getByRole("button", { name: /položku|Přidat|Rezervovat/ })).toBeHidden()

  // Delete after confirmation; the participant sees it gone on reload.
  await page.getByRole("button", { name: "Smazat položku Slavnostní večeře" }).click()
  await dialog.getByRole("button", { name: "Smazat" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText("Slavnostní večeře")).toBeHidden()
  await participant.reload()
  await expect(participant.getByText("Slavnostní večeře")).toBeHidden()
  await expect(participant.getByText("Snídaně")).toBeVisible()
  await participantContext.close()

  // Participation, capacity, price and payments did not move.
  expect(await snapshot()).toEqual(before)
})

test("a failed load, save or delete keeps the saved programme and shows no success", async ({
  page,
  browser,
}) => {
  const { event, jana } = await eventWithTwoParticipants(page, browser)
  await addItem(page.request, event, 0, DINNER)

  // Organizer: a failed load is an error with a retry, not an empty programme.
  await page.route(`${API_URL}/organizations/**/programme`, (route) =>
    route.request().method() === "GET" ? route.abort() : route.continue(),
  )
  await page.goto(termProgrammePage(event, 0))
  await expect(page.getByText("Program se nepodařilo načíst.")).toBeVisible()
  await expect(page.getByText("Program zatím nemá žádné položky")).toBeHidden()
  await page.unroute(`${API_URL}/organizations/**/programme`)
  await page.getByRole("button", { name: "Zkusit znovu" }).click()
  await expect(page.getByText(DINNER.title)).toBeVisible()

  // A failed save keeps the form input and the stored item.
  await page.route(`${API_URL}/organizations/**/programme/*`, (route) =>
    route.fulfill({ status: 500, body: "{}", contentType: "application/json" }),
  )
  await page.getByRole("button", { name: `Upravit položku ${DINNER.title}` }).click()
  const dialog = page.locator('[data-slot="dialog-content"]')
  await dialog.getByLabel("Název").fill("Přejmenovaná večeře")
  await dialog.getByRole("button", { name: "Uložit položku" }).click()
  await expect(
    dialog.getByText("Položku se nepodařilo uložit. Zkuste to prosím znovu."),
  ).toBeVisible()
  await expect(dialog.getByLabel("Název")).toHaveValue("Přejmenovaná večeře")
  await expect(page.getByText("Položka byla upravena.")).toBeHidden()
  await dialog.getByRole("button", { name: "Zrušit" }).click()
  await expect(page.getByText(DINNER.title)).toBeVisible()

  // A failed delete keeps the item.
  await page.getByRole("button", { name: `Smazat položku ${DINNER.title}` }).click()
  await dialog.getByRole("button", { name: "Smazat" }).click()
  await expect(
    dialog.getByText("Položku se nepodařilo smazat. Zkuste to prosím znovu."),
  ).toBeVisible()
  await expect(page.getByText("Položka byla smazána.")).toBeHidden()
  await dialog.getByRole("button", { name: "Zrušit" }).click()
  await page.unroute(`${API_URL}/organizations/**/programme/*`)
  await page.reload()
  await expect(page.getByText(DINNER.title)).toBeVisible()
  await expect(page.getByText("Přejmenovaná večeře")).toBeHidden()

  // Participant: a failed load is an error with a retry too.
  const participantContext = await browser.newContext()
  const participant = await participantContext.newPage()
  await participant.route(`${API_URL}/participant/**/programme`, (route) => route.abort())
  await signIn(participant, event, jana.email)
  await expect(participant.getByText("Program se nepodařilo načíst.")).toBeVisible()
  await expect(participant.getByText("Program zatím není připravený.")).toBeHidden()
  await participant.unroute(`${API_URL}/participant/**/programme`)
  await participant.getByRole("button", { name: "Zkusit znovu" }).click()
  await expect(participant.getByText(DINNER.title)).toBeVisible()
  await participantContext.close()
})

test("a waitlisted participant gets an explanation and no programme", async ({ page, browser }) => {
  const { event, bea, beaRegistration } = await eventWithTwoParticipants(page, browser)
  await addItem(page.request, event, 0, DINNER)

  const context = await browser.newContext()
  const participant = await context.newPage()
  await signIn(participant, event, bea.email)
  await expect(
    participant.getByText("Program je dostupný až po potvrzení účasti v tomto termínu."),
  ).toBeVisible()
  await expect(participant.getByText(DINNER.title)).toBeHidden()

  // Same through a direct request.
  const direct = await context.request.get(
    `${API_URL}/participant/registrations/${beaRegistration.id}/terms/${event.termIds[0]}/programme`,
  )
  expect(direct.status()).toBe(404)
  expect(await direct.text()).not.toContain(DINNER.title)
  await context.close()
})

test("direct links and forged requests reach no foreign programme", async ({ page, browser }) => {
  const { event, jana, janaRegistration, beaRegistration } = await eventWithTwoParticipants(
    page,
    browser,
  )
  await addItem(page.request, event, 0, DINNER)
  const items = (await (await page.request.get(programmeUrl(event, 0))).json()) as {
    items: { id: string }[]
  }
  const itemId = items.items[0]!.id

  // Another organization's organizer, with an organization and event of their own.
  const otherContext = await browser.newContext()
  const other = await setUpEvent(otherContext.request, { terms, rooms })
  const OTHER_ITEM = { ...BREAKFAST, startDate: "2027-08-16" }
  await addItem(otherContext.request, other, 1, OTHER_ITEM)

  const foreign = programmeUrl(event, 0)
  const crossed = [
    // Foreign organization, event and term.
    foreign,
    // Own organization and event, but the foreign term.
    `${API_URL}/organizations/${other.organizationId}/events/${other.eventId}/terms/${event.termIds[0]}/programme`,
    // Own term, but another organization's id in the path.
    `${API_URL}/organizations/${event.organizationId}/events/${other.eventId}/terms/${other.termIds[0]}/programme`,
  ]
  for (const url of crossed) {
    const read = await otherContext.request.get(url)
    expect(read.status()).toBe(404)
    expect(await read.text()).not.toContain(DINNER.title)
    const created = await otherContext.request.post(url, {
      data: { ...BREAKFAST, place: null, description: null },
      headers: writeHeaders,
    })
    expect(created.status()).toBe(404)
  }
  for (const method of ["put", "delete"] as const) {
    // A foreign item through the foreign path, and through the own term.
    for (const url of [`${foreign}/${itemId}`, `${programmeUrl(other, 1)}/${itemId}`]) {
      const response = await otherContext.request[method](url, {
        headers: writeHeaders,
        ...(method === "put" ? { data: { ...OTHER_ITEM, place: null, description: null } } : {}),
      })
      expect(response.status()).toBe(404)
    }
  }
  // Nothing was added, moved or removed anywhere.
  const stored = (await (await page.request.get(foreign)).json()) as { items: { title: string }[] }
  expect(stored.items.map((item) => item.title)).toEqual([DINNER.title])
  const ownStored = (await (await otherContext.request.get(programmeUrl(other, 1))).json()) as {
    items: { title: string }[]
  }
  expect(ownStored.items.map((item) => item.title)).toEqual([OTHER_ITEM.title])

  // The organizer page of a foreign term shows nothing of it.
  const otherPage = await otherContext.newPage()
  await otherPage.goto(termProgrammePage(event, 0))
  await expect(otherPage.getByText("Záznam není dostupný", { exact: true })).toBeVisible()
  await expect(otherPage.getByText(DINNER.title)).toBeHidden()
  await otherContext.close()

  // Without a participant session.
  const anonymous = await browser.newContext()
  const withoutSession = await anonymous.request.get(
    `${API_URL}/participant/registrations/${janaRegistration.id}/terms/${event.termIds[0]}/programme`,
  )
  expect(withoutSession.status()).toBe(401)
  // The organizer's session does not open the participant endpoint either.
  const organizerOnParticipantSide = await page.request.get(
    `${API_URL}/participant/registrations/${janaRegistration.id}/terms/${event.termIds[0]}/programme`,
  )
  expect(organizerOnParticipantSide.status()).toBe(401)

  // Jana: someone else's registration and a term outside her own are refused.
  const participantContext = await browser.newContext()
  const participant = await participantContext.newPage()
  await signIn(participant, event, jana.email)
  const base = `${API_URL}/participant/registrations`
  for (const url of [
    `${base}/${beaRegistration.id}/terms/${event.termIds[0]}/programme`,
    `${base}/${janaRegistration.id}/terms/${event.termIds[1]}/programme`,
    `${base}/${janaRegistration.id}/terms/${other.termIds[1]}/programme`,
  ]) {
    const response = await participantContext.request.get(url)
    expect(response.status()).toBe(404)
    expect(await response.text()).not.toContain(DINNER.title)
  }
  // Read only: a participant cannot write.
  const write = await participantContext.request.post(
    `${base}/${janaRegistration.id}/terms/${event.termIds[0]}/programme`,
    { data: BREAKFAST, headers: writeHeaders },
  )
  expect(write.status()).toBe(404)
  await participantContext.close()

  // Public surfaces carry no programme.
  const publicDetail = await anonymous.request.get(`${API_URL}/public/events/${event.publicId}`)
  expect(publicDetail.ok()).toBe(true)
  expect(await publicDetail.text()).not.toContain(DINNER.title)
  const publicPage = await anonymous.newPage()
  await publicPage.goto(`/e/${event.publicId}/registration`)
  await expect(publicPage.getByRole("heading", { name: event.name })).toBeVisible()
  await expect(publicPage.getByText(DINNER.title)).toBeHidden()
  await anonymous.close()
})

test("a sign-up without an organization has no programme to reach", async ({ page }) => {
  await signUpOrganizer(page.request)
  const own = await createOrganization(page.request)
  const response = await page.request.get(
    `${API_URL}/organizations/${own.id}/events/${own.id}/terms/${own.id}/programme`,
  )
  expect(response.status()).toBe(404)
})
