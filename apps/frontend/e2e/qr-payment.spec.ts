import { expect, test, type Browser } from "@playwright/test"

import { API_URL, newParticipant, register, setUpEvent } from "./support/api"
import { closeDb, createMagicLink, paymentToken } from "./support/db"
import { definition } from "./support/ui"

// F21-1: a participant pays part, then the rest, through the QR link; the
// organizer sees the same payments marked as QR payments.

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 1, terms: [0] }]

test.afterAll(closeDb)

test("a participant pays through the QR link in two parts", async ({ browser, page }) => {
  const organizerContext = await browser.newContext()
  const organizer = organizerContext.request
  const event = await setUpEvent(organizer, { terms, rooms })
  const jana = newParticipant("Jana")
  const registration = await register(organizer, event.publicId, jana, event.termIds)

  // Own detail shows the QR and the link while a debt remains.
  await page.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await page.getByRole("link", { name: `Detail přihlášky ${event.name}` }).click()
  await expect(page.getByRole("img", { name: "QR kód s odkazem na platbu" })).toBeVisible()
  const link = (await page.getByText(/\/platba\/[0-9a-f]{64}$/).textContent())!.trim()
  const path = new URL(link).pathname

  // The link works without any session, and opening it pays nothing.
  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(path)
  await expect(visitor.getByLabel("Částka (Kč)")).toHaveValue("1000")
  await expect(definition(visitor, "Zbývá zaplatit")).toHaveText("1 000 Kč")

  // The way back leads to the registration detail the participant came from.
  await expect(visitor.getByRole("link", { name: "Zpět na přihlášku" })).toHaveAttribute(
    "href",
    `/my-registrations/${registration.id}`,
  )

  // An invalid amount is explained and keeps the input.
  await visitor.getByLabel("Částka (Kč)").fill("1500")
  await visitor.getByRole("button", { name: "Zaplatit" }).click()
  await expect(visitor.getByText(/vyšší než zbývá zaplatit/)).toBeVisible()
  await expect(visitor.getByLabel("Částka (Kč)")).toHaveValue("1500")

  // A part, then the rest.
  await visitor.getByLabel("Částka (Kč)").fill("400")
  await visitor.getByRole("button", { name: "Zaplatit" }).click()
  await expect(visitor.getByText("Platba byla přijata")).toBeVisible()
  await expect(definition(visitor, "Zbývá zaplatit")).toHaveText("600 Kč")
  await visitor.getByRole("button", { name: "Zaplatit další část" }).click()
  await expect(visitor.getByLabel("Částka (Kč)")).toHaveValue("600")
  await visitor.getByRole("button", { name: "Zaplatit" }).click()
  await expect(definition(visitor, "Zbývá zaplatit")).toHaveText("0 Kč")

  // Reloading the page now offers nothing to pay.
  await visitor.reload()
  await expect(visitor.getByText("Přihláška je uhrazená")).toBeVisible()
  await expect(visitor.getByRole("button", { name: "Zaplatit" })).toHaveCount(0)
  await visitorContext.close()

  // The participant sees both payments marked, and no QR any more.
  await page.reload()
  await expect(page.getByText("QR platba")).toHaveCount(2)
  await expect(page.getByRole("img", { name: "QR kód s odkazem na platbu" })).toHaveCount(0)
  await expect(definition(page, "Zbývá zaplatit")).toHaveText("0 Kč")

  // The organizer reads the same amounts, marked as QR payments.
  const detail = await organizer.get(
    `${API_URL}/organizations/${event.organizationId}/events/${event.eventId}/registrations/${registration.id}`,
  )
  const body = (await detail.json()) as {
    balanceMinor: number
    payments: { amountMinor: number; source: string }[]
  }
  expect(body.balanceMinor).toBe(0)
  expect(body.payments.map((p) => [p.amountMinor, p.source])).toEqual([
    [40000, "qr_link"],
    [60000, "qr_link"],
  ])
  await organizerContext.close()
})

test("the result of a new registration offers the QR link right away", async ({
  browser,
  page,
}) => {
  const organizerContext = await browser.newContext()
  const event = await setUpEvent(organizerContext.request, { terms, rooms })
  await organizerContext.close()

  await page.goto(`/e/${event.publicId}`)
  await page.getByRole("checkbox", { name: /Turnus/ }).check()
  await page.getByLabel("Jméno").fill("Marie")
  await page.getByLabel("Příjmení").fill("Nováková")
  await page.getByLabel("E-mail").fill(`marie-${Date.now()}@example.test`)
  await page.getByLabel("Telefon").fill("+420 777 123 456")
  await page.getByRole("button", { name: "Odeslat přihlášku" }).click()

  await expect(page.getByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
  await expect(page.getByRole("img", { name: "QR kód s odkazem na platbu" })).toBeVisible()
  const link = (await page.getByText(/\/platba\/[0-9a-f]{64}$/).textContent())!.trim()

  // The link opens without any session and pays only this registration.
  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(new URL(link).pathname)
  await expect(visitor.getByLabel("Částka (Kč)")).toHaveValue("1000")

  // The page leads back to the registration; without a session that asks for a magic link.
  await visitor.getByRole("link", { name: "Zpět na přihlášku" }).click()
  await expect(visitor).toHaveURL(/\/my-registrations\/[0-9a-f-]{36}$/)
  await expect(visitor.getByRole("button", { name: "Poslat přihlašovací odkaz" })).toBeVisible()
  await visitorContext.close()
})

test("an invalid payment link shows nothing private", async ({ page }) => {
  await page.goto(`/platba/${"f".repeat(64)}`)
  await expect(page.getByText("Záznam není dostupný")).toBeVisible()
  await expect(page.getByLabel("Částka (Kč)")).toHaveCount(0)
})

// Failures of loading and saving: the error and a retry are visible, success
// is never shown falsely, and an uncertain result never pays twice.

const PAYMENT_API = /\/public\/payments\//

async function openPayment(browser: Browser) {
  const organizerContext = await browser.newContext()
  const organizer = organizerContext.request
  const event = await setUpEvent(organizer, { terms, rooms })
  const registration = await register(
    organizer,
    event.publicId,
    newParticipant("Eva"),
    event.termIds,
  )
  const path = `/platba/${await paymentToken(registration.id)}`
  const paid = async () => {
    const response = await organizer.get(
      `${API_URL}/organizations/${event.organizationId}/events/${event.eventId}/registrations/${registration.id}`,
    )
    const body = (await response.json()) as { payments: { amountMinor: number }[] }
    return body.payments.map((payment) => payment.amountMinor)
  }
  return { path, paid, close: () => organizerContext.close() }
}

test("a failed load shows the error and can be retried", async ({ browser, page }) => {
  const payment = await openPayment(browser)
  let isFailing = true
  await page.route(PAYMENT_API, (route) =>
    isFailing ? route.fulfill({ status: 500, json: {} }) : route.continue(),
  )

  await page.goto(payment.path)
  await expect(page.getByText(/Částku k úhradě se nepodařilo načíst/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Zaplatit" })).toHaveCount(0)

  isFailing = false
  await page.getByRole("button", { name: "Zkusit znovu" }).click()
  await expect(page.getByLabel("Částka (Kč)")).toHaveValue("1000")
  expect(await payment.paid()).toEqual([])
  await payment.close()
})

test("a failed save shows the error, keeps the input and a retry pays once", async ({
  browser,
  page,
}) => {
  const payment = await openPayment(browser)
  await page.goto(payment.path)
  await expect(page.getByLabel("Částka (Kč)")).toHaveValue("1000")

  let isFailing = true
  await page.route(PAYMENT_API, (route) =>
    isFailing && route.request().method() === "POST"
      ? route.fulfill({ status: 500, json: {} })
      : route.continue(),
  )
  await page.getByLabel("Částka (Kč)").fill("300")
  await page.getByRole("button", { name: "Zaplatit" }).click()

  await expect(page.getByText(/Platbu se nepodařilo dokončit/)).toBeVisible()
  await expect(page.getByText("Platba byla přijata")).toHaveCount(0)
  await expect(page.getByLabel("Částka (Kč)")).toHaveValue("300")
  expect(await payment.paid()).toEqual([])

  isFailing = false
  await page.getByRole("button", { name: "Zkusit znovu" }).click()
  await expect(page.getByText("Platba byla přijata")).toBeVisible()
  expect(await payment.paid()).toEqual([30000])
  await payment.close()
})

test("a lost response is verified by the retry without a second payment", async ({
  browser,
  page,
}) => {
  const payment = await openPayment(browser)
  await page.goto(payment.path)
  await expect(page.getByLabel("Částka (Kč)")).toHaveValue("1000")

  // The server saves the payment, but the answer never reaches the page.
  let isLosing = true
  await page.route(PAYMENT_API, async (route) => {
    if (isLosing && route.request().method() === "POST") {
      await route.fetch()
      await route.abort("failed")
    } else {
      await route.continue()
    }
  })
  await page.getByLabel("Částka (Kč)").fill("400")
  await page.getByRole("button", { name: "Zaplatit" }).click()

  await expect(page.getByText(/Platbu se nepodařilo dokončit/)).toBeVisible()
  await expect(page.getByText("Platba byla přijata")).toHaveCount(0)
  expect(await payment.paid()).toEqual([40000])

  isLosing = false
  await page.getByRole("button", { name: "Zkusit znovu" }).click()
  await expect(page.getByText("Platba byla přijata")).toBeVisible()
  await expect(definition(page, "Zbývá zaplatit")).toHaveText("600 Kč")
  expect(await payment.paid()).toEqual([40000])
  await payment.close()
})
