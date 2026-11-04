import { expect, test } from "@playwright/test"

import { publish, setUpEvent, type TermSpec } from "./support/api"

// Public event detail (F55): the organizer's presentation reaches the catalog
// detail, which leads to the registration form and back without losing the
// typed values. Unpublished events have no detail, yet keep their form link.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
  { label: "2. turnus", startDate: "2027-07-08", endDate: "2027-07-14", priceMinor: 250000 },
]

// A 1×1 PNG, enough for the type check and the <img>.
const PHOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

test("the organizer's presentation is shown on the public detail, which leads to the form and back", async ({
  page,
  browser,
}) => {
  const event = await setUpEvent(page.request, { terms })
  await publish(page.request, event)

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/settings`)
  const presentation = page.getByRole("region", { name: "Veřejná prezentace" })
  await presentation.getByLabel("Soubor s fotkou").setInputFiles({
    name: "les.png",
    mimeType: "image/png",
    buffer: PHOTO,
  })
  await expect(presentation.getByRole("button", { name: /^Odebrat/ })).toHaveCount(1)
  await expect(presentation.getByLabel("Popis akce")).toBeDisabled()
  await presentation.getByLabel("Podmínky účasti").fill("Věk 11 až 15 let.\nVlastní spacák.")
  await presentation.getByLabel("Jméno nebo název").fill("Jana Nováková")
  await presentation.getByLabel("E-mail").fill("tabor@example.test")
  await presentation.getByLabel("Telefon (nepovinné)").fill("+420 604 123 456")
  await presentation.getByRole("button", { name: "Uložit" }).click()
  await expect(page.getByText("Veřejná prezentace byla uložena.")).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole("region", { name: "Veřejná prezentace" }).getByLabel("Jméno nebo název"),
  ).toHaveValue("Jana Nováková")

  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/e/${event.publicId}`)
  await expect(visitor.getByRole("heading", { level: 1, name: event.name })).toBeVisible()
  await expect(visitor.getByText(event.location)).toBeVisible()
  await expect(visitor.getByRole("img", { name: `Fotka 1 akce ${event.name}` })).toBeVisible()
  const termsCard = visitor.getByRole("complementary")
  await expect(termsCard.getByRole("listitem").filter({ hasText: "1. turnus" })).toContainText(
    "1 000 Kč",
  )
  await expect(termsCard.getByRole("listitem").filter({ hasText: "2. turnus" })).toContainText(
    "2 500 Kč",
  )
  await expect(visitor.getByText("Vlastní spacák.")).toBeVisible()
  await expect(visitor.getByRole("link", { name: "tabor@example.test" })).toBeVisible()
  await expect(visitor.getByRole("link", { name: "+420 604 123 456" })).toBeVisible()

  await visitor.getByRole("link", { name: "Vyplnit přihlášku" }).click()
  await expect(visitor).toHaveURL(new RegExp(`/e/${event.publicId}/registration$`))
  await expect(visitor.getByRole("heading", { level: 1, name: event.name })).toBeVisible()
  await visitor.getByLabel("Jméno").fill("Anna")
  await visitor.getByRole("checkbox", { name: /2\. turnus/ }).check()

  await visitor.getByRole("link", { name: "Zpět na detail akce" }).click()
  await expect(visitor).toHaveURL(new RegExp(`/e/${event.publicId}$`))
  await visitor.getByRole("link", { name: "Vyplnit přihlášku" }).click()
  await expect(visitor.getByLabel("Jméno")).toHaveValue("Anna")
  await expect(visitor.getByRole("checkbox", { name: /2\. turnus/ })).toBeChecked()

  await visitor.goto(`/e/${event.publicId}`)
  await visitor.getByRole("link", { name: "Katalog akcí" }).click()
  await expect(visitor).toHaveURL(/\/events$/)
  await visitorContext.close()
})

test("a published draft explains registration is not open; an unpublished event has no detail but keeps its form", async ({
  page,
  browser,
}) => {
  const draft = await setUpEvent(page.request, { terms, isOpen: false })
  await publish(page.request, draft)
  const open = await setUpEvent(page.request, { terms })

  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()

  await visitor.goto(`/e/${draft.publicId}`)
  await expect(visitor.getByRole("heading", { level: 1, name: draft.name })).toBeVisible()
  await expect(visitor.getByText("Registrace zatím není otevřená")).toBeVisible()
  await expect(visitor.getByRole("link", { name: "Vyplnit přihlášku" })).toBeHidden()
  await expect(visitor.getByText("Organizátor veřejný kontakt neuvedl.")).toBeVisible()
  await expect(visitor.getByRole("main").getByRole("img")).toHaveCount(0)

  await visitor.goto(`/e/${open.publicId}`)
  await expect(visitor.getByText("Akce není dostupná")).toBeVisible()
  await expect(visitor.getByText(open.name)).toBeHidden()
  await visitor.getByRole("link", { name: "Zpět do katalogu" }).click()
  await expect(visitor).toHaveURL(/\/events$/)

  await visitor.goto(`/e/${open.publicId}/registration`)
  await expect(visitor.getByRole("heading", { level: 1, name: open.name })).toBeVisible()
  await expect(visitor.getByRole("link", { name: "Zpět na detail akce" })).toBeHidden()
  await expect(visitor.getByRole("button", { name: "Odeslat přihlášku" })).toBeVisible()
  await visitorContext.close()
})
