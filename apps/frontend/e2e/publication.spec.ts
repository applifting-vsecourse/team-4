import { expect, test } from "@playwright/test"

import { API_URL, createOrganization, setUpEvent, signUpOrganizer } from "./support/api"

// Catalog publication (F54-1): a failed change is not confirmed and changes
// nothing, and another organization's setting can be neither seen nor changed.

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]

const origin = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3050").origin
const toggleName = "Zveřejnit ve veřejném katalogu"

test("a failed publication change shows an error, saves nothing and can be retried", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, isOpen: false })
  const eventUrl = `${API_URL}/organizations/${event.organizationId}/events/${event.eventId}`
  const isPublished = async () =>
    ((await (await page.request.get(eventUrl)).json()) as { isPublished: boolean }).isPublished

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/settings`)
  const toggle = page.getByRole("switch", { name: toggleName })
  await expect(toggle).not.toBeChecked()

  await page.route("**/publication", (route) => route.fulfill({ status: 500, body: "{}" }))
  await toggle.click()
  await expect(page.getByText("Změnu publikace se nepodařilo uložit")).toBeVisible()
  await expect(page.getByText("Akce je zveřejněná v katalogu.")).toBeHidden()
  await expect(toggle).not.toBeChecked()
  expect(await isPublished()).toBe(false)
  await page.reload()
  await expect(page.getByRole("switch", { name: toggleName })).not.toBeChecked()

  await page.unroute("**/publication")
  await page.getByRole("switch", { name: toggleName }).click()
  await expect(page.getByText("Akce je zveřejněná v katalogu.")).toBeVisible()
  await expect(page.getByText("Změnu publikace se nepodařilo uložit")).toBeHidden()
  expect(await isPublished()).toBe(true)
  await page.reload()
  await expect(page.getByRole("switch", { name: toggleName })).toBeChecked()
})

test("another organizer can neither see nor change a foreign event's publication", async ({
  page,
  browser,
}) => {
  const ownerContext = await browser.newContext()
  const foreign = await setUpEvent(ownerContext.request, { terms, isOpen: false })
  const foreignUrl = `${API_URL}/organizations/${foreign.organizationId}/events/${foreign.eventId}`
  const foreignIsPublished = async () =>
    ((await (await ownerContext.request.get(foreignUrl)).json()) as { isPublished: boolean })
      .isPublished

  await signUpOrganizer(page.request)
  const own = await createOrganization(page.request)

  // Direct link: no switch and none of the foreign data.
  await page.goto(`/organizations/${foreign.organizationId}/events/${foreign.eventId}/settings`)
  await expect(page.getByText("Záznam není dostupný", { exact: true })).toBeVisible()
  await expect(page.getByRole("switch", { name: toggleName })).toBeHidden()
  await expect(page.getByText(foreign.name)).toBeHidden()

  // Forged requests, with the foreign organization and through the own one.
  const forgedUrls = [
    `${foreignUrl}/publication`,
    `${API_URL}/organizations/${own.id}/events/${foreign.eventId}/publication`,
  ]
  for (const url of forgedUrls) {
    const forged = await page.request.put(url, {
      data: { isPublished: true },
      headers: { Origin: origin },
    })
    expect(forged.status()).toBe(404)
    expect(await forged.text()).not.toContain(foreign.name)
  }
  const read = await page.request.get(foreignUrl)
  expect(read.status()).toBe(404)

  expect(await foreignIsPublished()).toBe(false)
  await ownerContext.close()
})
