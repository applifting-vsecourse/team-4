import { expect, test } from "@playwright/test"

import { newParticipant, register, setUpEvent } from "./support/api"
import { closeDb, createMagicLink } from "./support/db"

// Můj profil (S4-08): the participant's header and account menu, the optional
// profile kept across visits, and the prefill of a new registration that does
// not write back into the profile.

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]

test.afterAll(closeDb)

test("the participant saves a profile that prefills the next registration", async ({
  browser,
  page,
}) => {
  const organizerContext = await browser.newContext()
  const first = await setUpEvent(organizerContext.request, { terms })
  const next = await setUpEvent(organizerContext.request, { terms })
  const jana = newParticipant("Jana")
  await register(organizerContext.request, first.publicId, jana, first.termIds)
  await organizerContext.close()

  await page.goto(`/my-registrations/verify?token=${await createMagicLink(jana.email)}`)
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()

  // The participant's own navigation, no organizer entry, no e-mail in the header.
  const header = page.getByRole("banner")
  const portal = header.getByRole("navigation", { name: "Účastnický portál" })
  await expect(portal.getByRole("link", { name: "Moje přihlášky" })).toBeVisible()
  await expect(portal.getByRole("link", { name: "Katalog akcí" })).toBeVisible()
  await expect(header.getByRole("link", { name: "Organizátor" })).toHaveCount(0)
  await expect(header.getByText(jana.email)).toHaveCount(0)

  await header.getByRole("button", { name: "Účet" }).click()
  await expect(page.getByRole("menu").getByText(jana.email)).toBeVisible()
  await page.getByRole("menuitem", { name: "Můj profil" }).click()

  // A registration does not fill the profile: it starts empty.
  await expect(page.getByRole("heading", { name: "Můj profil", level: 1 })).toBeVisible()
  await expect(page.getByLabel("Jméno")).toHaveValue("")
  await page.getByLabel("Jméno").fill("Jana")
  await page.getByLabel("Příjmení").fill("Nováková")
  await page.getByLabel("Telefon").fill("777 123 456")
  await page.getByRole("button", { name: "Uložit profil" }).click()
  await expect(page.getByText("Profil uložen")).toBeVisible()
  // Saving returns to the page the profile was opened from.
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()

  await page.goto("/my-profile")
  await expect(page.getByLabel("Jméno")).toHaveValue("Jana")
  await expect(page.getByLabel("Příjmení")).toHaveValue("Nováková")

  await page.goto(`/e/${next.publicId}/registration`)
  await expect(page.getByLabel("Jméno")).toHaveValue("Jana")
  await expect(page.getByLabel("Příjmení")).toHaveValue("Nováková")
  await expect(page.getByLabel("E-mail")).toHaveValue(jana.email)
  await expect(page.getByLabel("Telefon")).toHaveValue(/777\s?123\s?456/)

  // Editing the prefilled form changes only this registration.
  await page.getByLabel("Jméno").fill("Jiná")
  await page.goto("/my-profile")
  await expect(page.getByLabel("Jméno")).toHaveValue("Jana")
})

test("after logging out no registration form is prefilled, not even going back", async ({
  browser,
  page,
}) => {
  const organizerContext = await browser.newContext()
  const event = await setUpEvent(organizerContext.request, { terms })
  const olga = newParticipant("Olga")
  await register(organizerContext.request, event.publicId, olga, event.termIds)
  await organizerContext.close()

  await page.goto(`/my-registrations/verify?token=${await createMagicLink(olga.email)}`)
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await page.goto("/my-profile")
  await page.getByLabel("Jméno").fill("Olga")
  await page.getByRole("button", { name: "Uložit profil" }).click()
  await expect(page.getByText("Profil uložen")).toBeVisible()
  // Opened directly, the saved profile leads to Moje přihlášky.
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()

  // A started form keeps a draft for the tab (F55).
  await page.goto(`/e/${event.publicId}/registration`)
  await expect(page.getByLabel("Jméno")).toHaveValue("Olga")
  await page.getByLabel(/Turnus/).check()
  await page.getByRole("banner").getByRole("link", { name: "Moje přihlášky" }).click()
  await page.getByRole("button", { name: "Účet" }).click()
  await page.getByRole("menuitem", { name: "Odhlásit se" }).click()
  await expect(page.getByRole("button", { name: "Účet" })).toBeHidden()

  await page.goBack()
  await expect(page.getByLabel("Jméno")).toHaveValue("")
  await expect(page.getByLabel("E-mail")).toHaveValue("")
  await page.reload()
  await expect(page.getByLabel("Jméno")).toHaveValue("")
})

test("after logging out the profile asks for a new link", async ({ browser, page }) => {
  const organizerContext = await browser.newContext()
  const event = await setUpEvent(organizerContext.request, { terms })
  const eva = newParticipant("Eva")
  await register(organizerContext.request, event.publicId, eva, event.termIds)
  await organizerContext.close()

  await page.goto(`/my-registrations/verify?token=${await createMagicLink(eva.email)}`)
  await expect(page.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  await page.goto("/my-profile")
  await expect(page.getByRole("heading", { name: "Můj profil", level: 1 })).toBeVisible()

  const account = page.getByRole("button", { name: "Účet" })
  await account.click()
  await page.getByRole("menuitem", { name: "Odhlásit se" }).click()
  await expect(account).toBeHidden()

  await page.reload()
  await expect(page.getByRole("button", { name: "Poslat přihlašovací odkaz" })).toBeVisible()
  await expect(page.getByText(eva.email)).toHaveCount(0)
})
