import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import { createOrganization, setUpEvent, signUpOrganizer } from "./support/api"

// Doors that stay closed: a draft's public link (S2-06) and another
// organization's event (S2-03).

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]

test("a draft's public link and an unknown one show the same unavailable page", async ({
  page,
  browser,
}) => {
  const draft = await setUpEvent(page.request, { terms, open: false })

  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/e/${draft.publicId}`)
  await expect(visitor.getByText("Akce není dostupná")).toBeVisible()
  await expect(visitor.getByText(draft.name)).toBeHidden()

  await visitor.goto(`/e/${randomUUID()}`)
  await expect(visitor.getByText("Akce není dostupná")).toBeVisible()
  await visitorContext.close()
})

test("another organizer gets no data from a foreign event", async ({ page, browser }) => {
  const otherContext = await browser.newContext()
  const foreign = await setUpEvent(otherContext.request, { terms })
  await otherContext.close()

  await signUpOrganizer(page.request)
  const own = await createOrganization(page.request)

  await page.goto(`/organizations/${foreign.organizationId}/events/${foreign.eventId}`)
  await expect(page.getByText("Záznam není dostupný", { exact: true })).toBeVisible()
  await expect(page.getByText(foreign.name)).toBeHidden()

  await page.getByRole("link", { name: "Zpět na přehled akcí" }).click()
  await expect(page).toHaveURL(new RegExp(`/organizations/${own.id}`))
})
