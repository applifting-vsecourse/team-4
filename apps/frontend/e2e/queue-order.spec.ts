import { expect, test, type Page } from "@playwright/test"

import { newParticipant, register, setUpEvent, type OpenEvent, type TermSpec } from "./support/api"
import {
  closeDb,
  decideTerms,
  registrationIdOf,
  setGenderHardAttribute,
  termIdOf,
} from "./support/db"

// Přihlášky → Vyhodnocení → fronta → Změnit pořadí (S3-03, F39-1): the
// organizer places an unconfirmed person right before another one of the
// queue, with a reason, after reviewing the original and the new order. Only
// that term's order changes, its proposal turns stale, and the move is in
// the history of the term and of the registration. A move made on an older
// queue is refused and needs a new confirmation.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-07-08", endDate: "2027-07-14", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 2, terms: [0, 1] }]

test.afterAll(closeDb)

const evaluationUrl = (event: OpenEvent) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=evaluation&queue=female`

/** The names of the shown queue's rows, in order. */
const queueNames = (page: Page) =>
  page
    .getByRole("tabpanel")
    .getByRole("table")
    .last()
    .getByRole("row")
    .filter({ has: page.getByRole("link") })
    .getByRole("link")

const openMove = async (page: Page, name: string) => {
  await page.getByRole("button", { name: `Akce: ${name} Nováková` }).click()
  await page.getByRole("menuitem", { name: "Změnit pořadí" }).click()
  return page.getByRole("dialog", { name: `Změnit pořadí: ${name} Nováková` })
}

test("the organizer moves a person in the queue with a reason; only that term changes", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setGenderHardAttribute(event.eventId)
  const participants: Record<string, string> = {}
  for (const [name, gender] of [
    ["Tereza", "female"],
    ["Jana", "female"],
    ["Klara", "female"],
    ["Eva", "female"],
    ["Petr", "male"],
  ] as const) {
    const participant = newParticipant(name)
    participants[name] = participant.email
    await register(page.request, event.publicId, participant, event.termIds, { gender })
  }
  // Tereza is confirmed in the first term: she is no longer in its queue.
  const tereza = await registrationIdOf(participants.Tereza!)
  await decideTerms(tereza, "confirmed", [await termIdOf(tereza, "1. turnus")])

  await page.goto(evaluationUrl(event))
  await page.getByRole("button", { name: "Přepočítat" }).click()
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(queueNames(page)).toHaveText([/Jana/, /Klara/, /Eva/])
  await expect(page.getByRole("button", { name: "Akce: Tereza Nováková" })).toHaveCount(0)

  // Nothing is sent without a target and a reason.
  const dialog = await openMove(page, "Eva")
  await expect(dialog).toContainText("1. turnus · fronta Žena")
  await dialog.getByRole("button", { name: "Pokračovat" }).click()
  await expect(
    dialog.getByText("Vyberte osobu, před kterou nebo za kterou se má přesunout."),
  ).toBeVisible()
  await expect(dialog.getByText("Uveďte důvod změny pořadí.")).toBeVisible()

  // Eva before Klara, reviewed before saving.
  await dialog.getByRole("combobox").click()
  await page.getByRole("option", { name: /Klara Nováková/ }).click()
  await dialog.getByLabel("Důvod").fill("Organizační tým")
  await dialog.getByRole("button", { name: "Pokračovat" }).click()
  const [original, moved] = [dialog.getByRole("list").first(), dialog.getByRole("list").last()]
  await expect(original.getByRole("listitem")).toHaveText([/Jana/, /Klara/, /Eva/])
  await expect(moved.getByRole("listitem")).toHaveText([/Jana/, /Eva/, /Klara/])
  await dialog.getByRole("button", { name: "Uložit pořadí" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText("Pořadí bylo uloženo.")).toBeVisible()

  await expect(queueNames(page)).toHaveText([/Jana/, /Eva/, /Klara/])
  await expect(
    page.getByRole("tabpanel").getByRole("row").filter({ hasText: "Eva" }).first(),
  ).toContainText("Přesunuto ručně")
  // The move is an input of the term: its proposal is evaluated again.
  const history = page
    .getByText("Historie termínu")
    .locator("xpath=ancestor::*[@data-slot='card'][1]")
  await expect(history).toContainText("Změna pořadí · Eva Nováková · 1. turnus · fronta Žena")
  await expect(history).toContainText("Důvod: Organizační tým")
  await expect(page.getByText("Aktuální návrh", { exact: true })).toBeVisible({ timeout: 30_000 })

  // The second term keeps its order.
  await page.getByRole("tab", { name: "2. turnus" }).click()
  await page.getByRole("tab", { name: /^Žena/ }).click()
  await expect(queueNames(page)).toHaveText([/Tereza/, /Jana/, /Klara/, /Eva/])

  // The registration detail lists the move in its history.
  await page.getByRole("link", { name: "Eva Nováková" }).click()
  await expect(
    page.getByText("Historie vyhodnocení").locator("xpath=ancestor::*[@data-slot='card'][1]"),
  ).toContainText("Změna pořadí · Eva Nováková · 1. turnus · fronta Žena")
})

test("a move made on an older queue is refused and needs a new confirmation", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await setGenderHardAttribute(event.eventId)
  for (const name of ["Jana", "Klara"]) {
    await register(page.request, event.publicId, newParticipant(name), event.termIds, {
      gender: "female",
    })
  }
  await page.goto(evaluationUrl(event))
  await expect(queueNames(page)).toHaveText([/Jana/, /Klara/])

  const dialog = await openMove(page, "Klara")
  await dialog.getByRole("combobox").click()
  await page.getByRole("option", { name: /Jana Nováková/ }).click()
  await dialog.getByLabel("Důvod").fill("Organizační tým")
  await dialog.getByRole("button", { name: "Pokračovat" }).click()

  // Someone registers while the review is open.
  await register(page.request, event.publicId, newParticipant("Eva"), event.termIds, {
    gender: "female",
  })
  await dialog.getByRole("button", { name: "Uložit pořadí" }).click()
  await expect(dialog.getByText("Pořadí nebylo uloženo")).toBeVisible()

  await dialog.getByRole("button", { name: "Načíst aktuální frontu" }).click()
  await expect(dialog.getByLabel("Důvod")).toHaveValue("Organizační tým")
  await dialog.getByRole("button", { name: "Pokračovat" }).click()
  await dialog.getByRole("button", { name: "Uložit pořadí" }).click()
  await expect(dialog).toBeHidden()
  await expect(queueNames(page)).toHaveText([/Klara/, /Jana/, /Eva/])
})
