import { expect, test, type Page } from "@playwright/test"

import { publish, setUpEvent, signUpOrganizer, unpublish, type OpenEvent } from "./support/api"

// The frame stays put (BUG 279): a page scrollbar that comes or goes never
// moves the layout sideways, and every page outside the organization's
// administration has the same header with the same entries in the same places.

// Headless Chromium hides scrollbars by default; the shift only exists with them.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } })

const terms = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
]

const registrationsUrl = (event: OpenEvent, view: string) =>
  `/organizations/${event.organizationId}/events/${event.eventId}/registrations?view=${view}`

// By element: an open menu hides the rest of the page from the accessibility tree.
const headingLeft = async (page: Page) => (await page.locator("h1").boundingBox())!.x

test("a page scrollbar that appears or disappears does not move the layout", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms })

  // Nothing waits for approval: the page is shorter than the window.
  await page.goto(registrationsUrl(event, "approvals"))
  await expect(page.getByText("Žádné změny nečekají na schválení.")).toBeVisible()
  const short = await headingLeft(page)

  // The term evaluation is taller than the window.
  await page.getByRole("tab", { name: "Vyhodnocení" }).click()
  await expect(page.getByRole("heading", { name: "Vyhodnocení termínu" })).toBeVisible()
  const isScrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  )
  const gutter = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)
  expect(isScrollable).toBe(true)
  expect(gutter).toBeGreaterThan(0)
  expect(await headingLeft(page)).toBe(short)

  // A menu locks the page scroll; the locked page stays in place too.
  await page.getByRole("button", { name: "Toggle theme" }).click()
  await expect(page.getByRole("menu")).toBeVisible()
  expect(await headingLeft(page)).toBe(short)
})

// Where a Přihlášky view puts its heading and the content below the heading row.
async function viewTop(page: Page) {
  const heading = page.getByRole("tabpanel").getByRole("heading", { level: 2 }).first()
  await expect(heading).toBeVisible()
  const box = (await heading.boundingBox())!
  const content = (await page
    .getByRole("tabpanel")
    .locator("section")
    .first()
    .locator(":scope > :nth-child(2)")
    .boundingBox())!
  return { headingMiddle: Math.round(box.y + box.height / 2), contentTop: Math.round(content.y) }
}

test("switching the Přihlášky views keeps the heading and content in place", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms })
  await page.goto(registrationsUrl(event, "list"))
  const list = await viewTop(page)

  for (const name of ["Ke schválení", "Vyhodnocení", "Seznam přihlášek"]) {
    await page.getByRole("tab", { name }).click()
    expect(await viewTop(page), name).toEqual(list)
  }
})

test("a view that is still loading keeps its heading in place", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms })
  await page.goto(registrationsUrl(event, "list"))
  const list = await viewTop(page)

  // Hold the evaluation's answer: the view shows its loading state meanwhile.
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route("**/evaluation**", async (route) => {
    await held
    await route.continue()
  })
  await page.getByRole("tab", { name: "Vyhodnocení" }).click()
  expect((await viewTop(page)).headingMiddle).toBe(list.headingMiddle)
  release()
})

type Entry = { name: string; x: number }

// The visible links and buttons of the header with their left edges.
async function headerEntries(page: Page): Promise<Entry[]> {
  const banner = page.getByRole("banner")
  await expect(banner).toBeVisible()
  return banner.locator("a:visible, button:visible").evaluateAll((elements) =>
    elements.map((element) => ({
      name: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim(),
      x: Math.round(element.getBoundingClientRect().x),
    })),
  )
}

test("every page outside the organization's administration has the same header", async ({
  page,
  request,
}) => {
  // Set up through a separate session, so the page stays a visitor's.
  const event = await setUpEvent(request, { terms })
  await publish(request, event)

  await page.goto("/")
  const landing = await headerEntries(page)
  expect(landing.map((entry) => entry.name)).toEqual(
    expect.arrayContaining(["Katalog akcí", "Moje přihlášky", "Organizátor"]),
  )

  const visitorPages = [
    "/events",
    `/e/${event.publicId}`,
    `/e/${event.publicId}/registration`,
    "/my-registrations",
    "/login",
    "/signup",
  ]
  for (const path of visitorPages) {
    await page.goto(path)
    await expect(page.getByRole("heading").first()).toBeVisible()
    expect.soft(await headerEntries(page), path).toEqual(expect.arrayContaining(landing))
  }

  // A signed-in organizer's own menu joins the same entries without moving them.
  await signUpOrganizer(page.request)
  await page.goto("/organizations")
  await expect(page.getByRole("button", { name: "Uživatelské menu" })).toBeVisible()
  expect(await headerEntries(page), "/organizations").toEqual(expect.arrayContaining(landing))

  await unpublish(request, event)
})
