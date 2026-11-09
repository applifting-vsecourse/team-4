import { expect, test } from "@playwright/test"

import { createOrganization, signUpOrganizer } from "./support/api"

// The two ways in from the landing page (S2-01) and the organizer's sign-in
// and sign-up edges that live in BetterAuth (S2-02).

test("the landing page leads organizers and participants to different sign-ins", async ({
  page,
}) => {
  const entries = page.getByRole("navigation", { name: "Vstup do aplikace" })

  await page.goto("/")
  await entries.getByRole("link", { name: "Organizátor", exact: true }).click()
  await expect(page.getByLabel("Heslo")).toBeVisible()
  await expect(page.getByRole("link", { name: "Registrovat organizátora" })).toBeVisible()

  await page.goto("/")
  await entries.getByRole("link", { name: "Moje přihlášky" }).click()
  await expect(page.getByLabel("E-mail")).toBeVisible()
  await expect(page.getByLabel("Heslo")).toBeHidden()
})

test("the landing page leads a visitor to the public catalog without signing in", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("main").getByRole("link", { name: "Hledám akci" }).first().click()
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole("heading", { name: "Katalog akcí", level: 1 })).toBeVisible()

  await page.goto("/")
  await page
    .getByRole("navigation", { name: "Vstup do aplikace" })
    .getByRole("link", { name: "Katalog akcí" })
    .click()
  await expect(page).toHaveURL(/\/events$/)
})

test("the landing page leads to the organizer and participant pages, which survive a reload", async ({
  page,
}) => {
  await page.goto("/")
  const audience = page.getByRole("navigation", { name: "Informace o akc.io" })
  await audience.getByRole("link", { name: "Pro organizátory" }).click()
  await expect(page).toHaveURL(/\/for-organizers$/)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Pro organizátory", level: 1 })).toBeVisible()

  const other = page.getByRole("navigation", { name: "Další stránky" })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.getByRole("button", { name: "Otevřít menu" }).click()
  await audience.getByRole("link", { name: "Pro účastníky" }).click()
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden()
  await expect(page).toHaveURL(/\/for-participants$/)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Pro účastníky", level: 1 })).toBeVisible()

  await other.getByRole("link", { name: "Úvod" }).click()
  await expect(page.getByRole("heading", { name: "Akce bez chaosu", level: 1 })).toBeVisible()
})

test("an organizer reloading inside the second organization stays in it", async ({ page }) => {
  await signUpOrganizer(page.request)
  await createOrganization(page.request)
  const second = await createOrganization(page.request)

  await page.goto(`/organizations/${second.id}`)
  await expect(page.getByText(second.name).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText(second.name).first()).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/organizations/${second.id}`))
})

test("a wrong password keeps the organizer in the form with an error", async ({
  page,
  playwright,
}) => {
  const other = await playwright.request.newContext()
  const organizer = await signUpOrganizer(other)
  await other.dispose()

  await page.goto("/login")
  await page.getByLabel("E-mail").fill(organizer.email)
  await page.getByLabel("Heslo").fill("spatne-heslo-123")
  await page.getByRole("button", { name: "Přihlásit se" }).click()

  await expect(page.getByText("Nesprávný e-mail nebo heslo.")).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByLabel("E-mail")).toHaveValue(organizer.email)
})

test("signing up with a used e-mail offers to sign in instead", async ({ page, playwright }) => {
  const other = await playwright.request.newContext()
  const organizer = await signUpOrganizer(other)
  await other.dispose()

  await page.goto("/signup")
  await page.getByLabel("Jméno").fill("Druhá Eva")
  await page.getByLabel("E-mail").fill(organizer.email)
  await page.getByLabel("Heslo").fill("jine-heslo-123")
  await page.getByRole("button", { name: "Zaregistrovat se" }).click()

  await expect(page.getByText("Účet s tímto e-mailem už existuje.")).toBeVisible()
  await expect(page.getByRole("link", { name: "Přejít na přihlášení" })).toBeVisible()
  await expect(page).toHaveURL(/\/signup/)
  // Not signed in: the organizer area sends the visitor to sign in.
  await page.goto("/organizations")
  await expect(page).toHaveURL(/\/login/)
})
