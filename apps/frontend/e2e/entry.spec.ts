import { expect, test } from "@playwright/test"

import { createOrganization, signUpOrganizer } from "./support/api"

// The two ways in from the landing page (S2-01) and the organizer's sign-in
// and sign-up edges that live in BetterAuth (S2-02).

test("the landing page leads organizers and participants to different sign-ins", async ({
  page,
}) => {
  const entries = page.getByRole("region", { name: "Kudy dál" })

  await page.goto("/")
  await entries.getByRole("link", { name: "Organizátor", exact: true }).click()
  await expect(page.getByLabel("Heslo")).toBeVisible()
  await expect(page.getByRole("link", { name: "Registrovat organizátora" })).toBeVisible()

  await page.goto("/")
  await entries.getByRole("link", { name: "Moje přihlášky" }).click()
  await expect(page.getByLabel("E-mail")).toBeVisible()
  await expect(page.getByLabel("Heslo")).toBeHidden()
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
})
