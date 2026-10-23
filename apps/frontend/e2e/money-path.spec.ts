import { test } from "@playwright/test"

import { contextOptions, expect, isDemo, step, type } from "./support/demo"
import { definition, pickDate } from "./support/ui"

// The money path end to end, through the real UI, API and database: an
// organizer prepares an event with one bed, two participants register (one
// gets the bed, one is waitlisted), and recorded payments settle the debt.
//
// `pnpm frontend demo` runs this as a guided walkthrough (see support/demo.ts).

const run = Date.now().toString(36)
const organizer = {
  name: "Eva Pořadatelka",
  email: `eva-${run}@example.test`,
  password: "demo-heslo-123",
}

test("an organizer opens an event, participants register and payments settle the debt", async ({
  page,
  browser,
}) => {
  await step(page, "1 · Pořadatelka si založí účet a organizaci", async () => {
    await page.goto("/signup")
    await type(page.getByLabel("Jméno"), organizer.name)
    await type(page.getByLabel("E-mail"), organizer.email)
    await type(page.getByLabel("Heslo"), organizer.password)
    await page.getByRole("button", { name: "Zaregistrovat se" }).click()

    await page.getByRole("link", { name: "Založit organizaci" }).click()
    await type(page.getByLabel("Název organizace"), `Skautský oddíl Rosa ${run}`)
    await page.getByRole("button", { name: "Založit organizaci" }).click()
    await expect(page.getByRole("heading", { name: "Akce a turnusy", level: 1 })).toBeVisible()
  })

  await step(page, "2 · Vytvoří akci", async () => {
    await page.getByRole("link", { name: "Nová akce" }).click()
    await type(page.getByLabel("Název akce"), "Letní tábor Rosa")
    await type(page.getByLabel("Místo"), "Tábořiště Hrachov")
    await type(page.getByLabel("Popis"), "Dva týdny v lesích pro děti od 7 do 12 let.")
    await page.getByRole("button", { name: "Vytvořit akci" }).click()
    await expect(page.getByRole("heading", { name: "Letní tábor Rosa", level: 1 })).toBeVisible()
  })

  await step(page, "3 · Přidá turnus s cenou", async () => {
    await page
      .getByRole("navigation", { name: "Části akce" })
      .getByRole("link", { name: "Nastavení" })
      .click()
    await page.getByRole("button", { name: "Přidat termín" }).click()
    const dialog = page.getByRole("dialog", { name: "Nový termín" })
    await type(dialog.getByLabel("Označení"), "1. turnus")
    await pickDate(page, dialog.getByLabel("Začátek"), "2027-07-04")
    await pickDate(page, dialog.getByLabel("Konec"), "2027-07-17")
    await type(dialog.getByLabel("Cena (Kč)"), "4500")
    await dialog.getByRole("button", { name: "Uložit termín" }).click()
    await expect(page.getByRole("cell", { name: "4. 7. – 17. 7. 2027" })).toBeVisible()
  })

  await step(page, "4 · Vyplní účet pro platby", async () => {
    await type(page.getByLabel("Číslo účtu"), "2000145399")
    await type(page.getByLabel("Kód banky"), "0800")
    await type(page.getByLabel("Počet dní do připomenutí platby"), "14")
    await page.getByRole("button", { name: "Uložit platební nastavení" }).click()
    await expect(
      page.getByText("Číslo účtu a počet dní do připomenutí platby – splněno"),
    ).toBeVisible()
  })

  await step(page, "5 · Přidá chatku s jedním lůžkem", async () => {
    await page.getByRole("link", { name: "Ubytování" }).first().click()
    await page.getByRole("button", { name: "Přidat pokoj" }).click()
    const dialog = page.getByRole("dialog", { name: "Nový pokoj" })
    await type(dialog.getByLabel("Označení"), "Chatka Sova")
    await type(dialog.getByLabel("Počet lůžek"), "1")
    await dialog.getByRole("checkbox", { name: /1\. turnus/ }).check()
    await dialog.getByRole("button", { name: "Uložit" }).click()
    await expect(page.getByRole("row", { name: /1\. turnus .* 1 0 1 0$/ })).toBeVisible()
  })

  const publicUrl = await step(page, "6 · Otevře přihlašování a sdílí odkaz", async () => {
    await page.getByRole("link", { name: "Nastavení" }).first().click()
    await page.getByRole("button", { name: "Otevřít přihlašování" }).click()
    await expect(page.getByText("Přihlašování je otevřené")).toBeVisible()
    return page.getByLabel("Veřejný odkaz na přihlášku").inputValue()
  })

  // Participants are anonymous visitors in their own browser.
  const visitorContext = await browser.newContext(contextOptions)
  const visitor = await visitorContext.newPage()

  const register = async (firstName: string, lastName: string, email: string) => {
    await visitor.goto(publicUrl)
    await visitor.getByRole("checkbox", { name: /1\. turnus/ }).check()
    await type(visitor.getByLabel("Jméno"), firstName)
    await type(visitor.getByLabel("Příjmení"), lastName)
    await type(visitor.getByLabel("E-mail"), email)
    await type(visitor.getByLabel("Telefon"), "+420 777 123 456")
    await visitor.getByRole("button", { name: "Odeslat přihlášku" }).click()
    return visitor.getByRole("region", { name: "Přihláška je uložená" })
  }

  await step(visitor, "7 · Anna se přihlásí a dostane poslední lůžko", async () => {
    const result = await register("Anna", "Nováková", `anna-${run}@example.test`)
    await expect(result.getByText("Potvrzeno")).toBeVisible()
    await expect(definition(result, "Zbývá zaplatit")).toHaveText("4 500 Kč")
    await expect(definition(result, "Číslo účtu")).toHaveText("2000145399/0800")
  })

  await step(visitor, "8 · Petr se přihlásí, lůžko už není: je náhradník", async () => {
    const result = await register("Petr", "Svoboda", `petr-${run}@example.test`)
    await expect(result.getByText("Náhradník")).toBeVisible()
  })

  if (isDemo) await page.bringToFront()

  await step(page, "9 · Pořadatelka vidí obsazenost a obě přihlášky", async () => {
    await page.getByRole("link", { name: "Ubytování" }).first().click()
    // The page may show the counts cached when the room was saved: a suspense
    // query counts as fresh for a second, and the test gets here faster than
    // any person. Aktualizovat is how the organizer reloads them.
    const occupancy = page.getByRole("region", { name: "Obsazenost po termínech" })
    await occupancy.getByRole("button", { name: "Aktualizovat" }).click()
    await expect(occupancy.getByRole("row", { name: /1\. turnus .* 1 1 0 1$/ })).toBeVisible()

    await page.getByRole("link", { name: "Přihlášky" }).first().click()
    await expect(page.getByRole("link", { name: /^Otevřít přihlášku/ })).toHaveCount(2)
    await expect(page.getByRole("row", { name: /Anna Nováková/ })).toContainText("Nezaplaceno")
  })

  const recordPayment = async (amount: string) => {
    await page.getByRole("button", { name: "Zaznamenat platbu" }).click()
    const dialog = page.getByRole("dialog", { name: "Zaznamenat platbu" })
    await type(dialog.getByLabel("Přijatá částka (Kč)"), amount)
    await dialog.getByRole("button", { name: "Uložit platbu" }).click()
    await expect(dialog).toBeHidden()
  }

  await step(page, "10 · Zapíše Anně zálohu 2 000 Kč", async () => {
    await page.getByRole("link", { name: "Otevřít přihlášku Anna Nováková" }).click()
    await recordPayment("2000")
    await expect(page.getByText("Částečně zaplaceno")).toBeVisible()
    await expect(definition(page, "Dluh")).toHaveText("2 500 Kč")
  })

  await step(page, "11 · Doplatek 2 500 Kč vyrovná dluh", async () => {
    await recordPayment("2500")
    await expect(page.getByText("Zaplaceno", { exact: true }).first()).toBeVisible()
    await expect(definition(page, "Přijato")).toHaveText("4 500 Kč")
  })

  await visitorContext.close()
})
