import { expect, test, type Page } from "@playwright/test"

import {
  newParticipant,
  questionsOf,
  register,
  setEvaluationMode,
  setUpEvent,
  type TermSpec,
} from "./support/api"

// Nastavení → Otázky v přihlášce (#485): the organizer adds a categorical
// question, the public form asks it, the answer shows on the registration and
// the question can split rooms like gender does.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
]
// One room of two beds: split by school, only one school fits.
const rooms = [{ label: "Chatka", baseBeds: 2, terms: [0] }]

const orderRow = (page: Page, name: string) =>
  page.getByRole("tabpanel").getByRole("row").filter({ hasText: name }).first()

test("a question of the organizer is asked, shown and splits rooms", async ({ page, browser }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setEvaluationMode(page.request, event, "manual")
  const eventPath = `/organizations/${event.organizationId}/events/${event.eventId}`

  // The organizer adds a required question with two options.
  await page.goto(`${eventPath}/settings`)
  const section = page.getByRole("region", { name: "Otázky v přihlášce" })
  await expect(section.getByText("Akce nemá vlastní otázky")).toBeVisible()
  await section.getByRole("button", { name: "Přidat otázku" }).click()
  await section.getByRole("textbox", { name: "Otázka 1", exact: true }).fill("Škola")
  await section.getByRole("textbox", { name: "Škola, možnost 1" }).fill("ZŠ Lipová")
  await section.getByRole("textbox", { name: "Škola, možnost 2" }).fill("ZŠ Dubová")
  await section.getByRole("checkbox", { name: "Povinná odpověď" }).check()
  await section.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Otázky přihlášky byly uloženy.")).toBeVisible()

  // A visitor answers it on the public form; it is required.
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
  await expect(participant.getByText("Vyberte odpověď.")).toBeVisible()
  await participant.getByRole("radio", { name: "ZŠ Lipová" }).check()
  await participant.getByRole("button", { name: "Odeslat přihlášku" }).click()
  await expect(participant.getByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
  await context.close()

  // Another participant from the other school, through the API.
  const [school] = await questionsOf(page.request, event)
  const dubova = school!.options.find((option) => option.label === "ZŠ Dubová")!
  await register(page.request, event.publicId, newParticipant("Petr"), event.termIds, {
    gender: "male",
    answers: [{ questionId: school!.id, optionId: dubova.id }],
  })

  // The organizer sees the answer on the registration.
  await page.goto(`${eventPath}/registrations`)
  await page
    .getByRole("link", { name: new RegExp(jana.lastName) })
    .first()
    .click()
  const answers = page.getByRole("region", { name: "Otázky pořadatele" })
  await expect(answers).toContainText("Škola")
  await expect(answers).toContainText("ZŠ Lipová")

  // Rooms split by the question: the two schools no longer share the room.
  await page.goto(`${eventPath}/settings`)
  const rules = page.getByRole("region", { name: "Pravidla ubytování" })
  await rules.getByRole("radio", { name: "Škola" }).check()
  await rules.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Pravidla ubytování byla uložena.")).toBeVisible()

  await page.goto(`${eventPath}/registrations?view=evaluation`)
  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(orderRow(page, "Jana")).toContainText("Vhodný")
  await expect(orderRow(page, "Petr")).toContainText("Neubytovatelný")
  await expect(page.getByRole("tab", { name: /^ZŠ Lipová/ })).toBeVisible()

  // The question used by the rules cannot be removed.
  await page.goto(`${eventPath}/settings`)
  await expect(section.getByRole("button", { name: "Odebrat Škola" })).toBeDisabled()
})
