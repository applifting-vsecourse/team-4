import { test } from "@playwright/test"

import { closeDb, createMagicLink } from "./support/db"
import {
  contextOptions,
  endDemo,
  expect,
  isDemo,
  scrollPage,
  step,
  type,
  withQuickDemoPace,
} from "./support/demo"
import { createMobileStage, MOBILE_VIEWPORT, openMobileSignInLink } from "./support/mobile-stage"
import { isRecording } from "./support/recording"
import { definition, pickDate } from "./support/ui"

// Presentation path; exhaustive validations remain in demo-v2.spec.ts.
const run = Date.now().toString(36)
const organizer = {
  name: "Alena Novotná",
  email: `alena-${run}@example.test`,
  password: "demo-heslo-123",
}
const participant = {
  firstName: "Jana",
  lastName: "Nováková",
  email: process.env.DEMO_PARTICIPANT_EMAIL ?? `jana-${run}@example.test`,
}
const eventName = "Víkend první pomoci pro vedoucí"
const isRemote = Boolean(
  process.env.E2E_BASE_URL && new URL(process.env.E2E_BASE_URL).hostname !== "localhost",
)

test.afterAll(closeDb)

test("Sprint Review: organizátor na desktopu, účastnice na mobilu", async ({ page, browser }) => {
  test.setTimeout(isDemo ? 0 : 300_000)
  page.context().setDefaultTimeout(15_000)
  page.context().setDefaultNavigationTimeout(30_000)
  if (isRemote && (!isDemo || !process.env.DEMO_PARTICIPANT_EMAIL)) {
    throw new Error(
      "Nasazené demo vyžaduje DEMO=1 a DEMO_PARTICIPANT_EMAIL se skutečnou demo schránkou.",
    )
  }
  const mobileContext = await browser.newContext({
    ...contextOptions,
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3050",
    viewport: isDemo && !isRecording ? null : MOBILE_VIEWPORT,
  })
  mobileContext.setDefaultTimeout(15_000)
  mobileContext.setDefaultNavigationTimeout(30_000)
  const { window: mobileWindow, content: mobile } = await createMobileStage(
    mobileContext,
    process.env.E2E_BASE_URL ?? "http://localhost:3050",
  )
  const nav = (name: string) =>
    page.getByRole("link", { name, exact: true }).filter({ visible: true }).first()
  const mobileFits = async () => {
    expect(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
  }
  let publicUrl = ""
  let registrationId = ""

  try {
    await page.goto("/")
    await step(page, "Úvod · Landing page akc.io — S2-01", async () => {
      await page
        .getByRole("heading", {
          name: "Přihlášky, ubytování a platby pro vaše akce na jednom místě",
          level: 1,
        })
        .waitFor({ state: "visible" })
      await scrollPage(page)
      const entries = page.getByRole("region", { name: "Kudy dál" })
      await expect(entries.getByRole("link", { name: "Moje přihlášky", exact: true })).toBeVisible()
      await expect(entries.getByRole("link", { name: "Organizátor", exact: true })).toBeVisible()
      // End this step on the landing page, with both entry points in view.
      // The NEXT presenter input authorizes navigation; scrolling alone never does.
      if (isDemo && process.env.DEMO_PAUSE === "0") await page.waitForTimeout(6_000)
    })
    await step(page, "1/9 · Alena zakládá organizaci — S2-02", async () => {
      await page
        .getByRole("region", { name: "Kudy dál" })
        .getByRole("link", { name: "Organizátor", exact: true })
        .click()
      await withQuickDemoPace(page, async () => {
        await page.getByRole("link", { name: "Registrovat organizátora" }).click()
        await type(page.getByLabel("Jméno"), organizer.name, { shouldClear: false, pace: "quick" })
        await type(page.getByLabel("E-mail"), organizer.email, {
          shouldClear: false,
          pace: "quick",
        })
        await type(page.getByLabel("Heslo"), organizer.password, {
          shouldClear: false,
          pace: "quick",
        })
        await page.getByRole("button", { name: "Zaregistrovat se" }).click()
      })
      await withQuickDemoPace(page, async () => {
        await page.getByRole("link", { name: "Založit organizaci" }).click()
        await type(page.getByLabel("Název organizace"), "Spolek Jasan", { shouldClear: false })
        await page.getByRole("button", { name: "Založit organizaci" }).click()
      })
      await expect(page.getByRole("heading", { name: "Akce a turnusy", level: 1 })).toBeVisible()
    })

    await step(
      page,
      "2/9 · Víkendová akce se dvěma termíny — S2-04, Kontextová navigace",
      async () => {
        await nav("Nová akce").click()
        await type(page.getByLabel("Název akce"), eventName)
        await type(page.getByLabel("Místo"), "Chata Rozvoj, Krkonoše")
        await type(
          page.getByLabel("Popis"),
          "Praktický víkend první pomoci v přírodě pro vedoucí oddílů.",
        )
        await page.getByRole("button", { name: "Vytvořit akci" }).click()
        await page.getByRole("link", { name: "Přidat termín" }).click()
        for (const [label, date, price] of [
          ["Sobota", "2026-11-07", "1000"],
          ["Neděle", "2026-11-08", "1500"],
        ]) {
          const createTerm = async () => {
            await page.getByRole("button", { name: "Přidat termín" }).click()
            const dialog = page.getByRole("dialog", { name: "Nový termín" })
            const pace = label === "Neděle" ? "quick" : "normal"
            await type(dialog.getByLabel("Označení"), label!, {
              pace,
              shouldClear: pace !== "quick",
            })
            await withQuickDemoPace(page, async () => {
              await pickDate(page, dialog.getByLabel("Začátek"), date!, { pace: "quick" })
              await pickDate(page, dialog.getByLabel("Konec"), date!, { pace: "quick" })
            })
            await type(dialog.getByLabel("Cena (Kč)"), price!, {
              pace,
              shouldClear: pace !== "quick",
            })
            await dialog.getByRole("button", { name: "Uložit termín" }).click()
            await expect(dialog).toBeHidden()
          }
          if (label === "Neděle") await withQuickDemoPace(page, createTerm)
          else await createTerm()
        }
      },
    )

    await step(page, "3/9 · Účet a dostupná lůžka — S2-09, S2-05", async () => {
      await type(page.getByLabel("Číslo účtu"), "2000145399")
      await type(page.getByLabel("Kód banky"), "0800")
      await type(page.getByLabel("Počet dní do připomenutí platby"), "14")
      await page.getByRole("button", { name: "Uložit platební nastavení" }).click()
      await expect(page.getByRole("button", { name: "Otevřít přihlašování" })).toBeEnabled()
      // Keep the readiness checklist visible for the presenter before opening rooms.
      if (isDemo) await page.waitForTimeout(5_000)
      await nav("Ubytování").click()
      await page.getByRole("button", { name: "Přidat pokoj" }).click()
      const dialog = page.getByRole("dialog", { name: "Nový pokoj" })
      await type(dialog.getByLabel("Označení"), "Podkrovní pokoj")
      await type(dialog.getByLabel("Počet lůžek"), "12")
      await dialog.getByRole("checkbox", { name: /Sobota/ }).check()
      await dialog.getByRole("checkbox", { name: /Neděle/ }).check()
      await dialog.getByRole("button", { name: "Uložit", exact: true }).click()
      await expect(dialog).toBeHidden()
    })

    await step(page, "4/9 · Alena otevře přihlašování a sdílí odkaz — S2-06", async () => {
      await nav("Nastavení").click()
      publicUrl = await page.getByLabel("Veřejný odkaz na přihlášku").inputValue()
      await page.getByRole("button", { name: "Otevřít přihlašování" }).click()
      await expect(page.getByText("Přihlašování je otevřené")).toBeVisible()
    })

    await step(mobileWindow, "5/9 · Jana se přihlásí z telefonu — S2-07, S2-08", async () => {
      await mobile.goto(new URL(new URL(publicUrl).pathname, page.url()).href)
      await expect(mobile.getByRole("heading", { name: eventName })).toBeVisible()
      await mobileFits()
      await mobile.getByRole("checkbox", { name: /Sobota/ }).check()
      await mobile.getByRole("checkbox", { name: /Neděle/ }).check()
      await expect(mobile.getByRole("region", { name: "Cena vybraných termínů" })).toContainText(
        "2 500 Kč",
      )
      await withQuickDemoPace(mobileWindow, async () => {
        await type(mobile.getByLabel("Jméno"), participant.firstName, { shouldClear: false })
        await type(mobile.getByLabel("Příjmení"), participant.lastName, { shouldClear: false })
        await type(mobile.getByLabel("E-mail"), participant.email, { shouldClear: false })
        await type(mobile.getByLabel("Telefon"), "+420 777 123 456", { shouldClear: false })
      })
      await mobile.getByRole("button", { name: "Odeslat přihlášku" }).click()
      await expect(mobile.getByRole("region", { name: "Přihláška je uložená" })).toBeVisible()
    })

    await step(
      mobileWindow,
      "6/9 · Potvrzení obou termínů a pokyny k platbě — S2-14, S2-16",
      async () => {
        const result = mobile.getByRole("region", { name: "Přihláška je uložená" })
        for (const label of ["Sobota", "Neděle"]) {
          await expect(result.getByRole("listitem").filter({ hasText: label })).toContainText(
            "Potvrzeno",
          )
        }
        await expect(definition(result, "K úhradě za potvrzené termíny")).toHaveText("2 500 Kč")
        await expect(definition(result, "Variabilní symbol")).toHaveText(/\d+/)
        await mobileFits()
      },
    )

    await step(page, "7/9 · Alena vidí obsazenost a přihlášku Jany — S2-10, S2-11", async () => {
      await nav("Ubytování").click()
      const occupancy = page.getByRole("region", { name: "Obsazenost po termínech" })
      await occupancy.getByRole("button", { name: "Aktualizovat" }).click()
      for (const label of ["Sobota", "Neděle"]) {
        await expect(
          occupancy.getByRole("row", { name: new RegExp(`${label} .* 12 1 11 0$`) }),
        ).toBeVisible()
      }
      // Leave time to explain both occupancy rows before switching screens.
      if (isDemo) await page.waitForTimeout(5_000)
      await nav("Přihlášky").click()
      const janaRegistration = page.getByRole("link", { name: /Otevřít přihlášku Jana Nováková/ })
      await expect(janaRegistration).toBeVisible()
      if (isDemo) await page.waitForTimeout(4_000)
      await janaRegistration.click()
      registrationId = new URL(page.url()).pathname.split("/").at(-1)!
      await expect(definition(page, "Dluh")).toHaveText("2 500 Kč")
    })

    await step(page, "8/9 · Přijatá platba vyrovná dluh — S2-12", async () => {
      await page.getByRole("button", { name: "Zaznamenat platbu" }).click()
      const dialog = page.getByRole("dialog", { name: "Zaznamenat platbu" })
      await type(dialog.getByLabel("Přijatá částka (Kč)"), "2500")
      await dialog.getByRole("button", { name: "Uložit platbu" }).click()
      await expect(dialog).toBeHidden()
      await expect(page.locator("dt").filter({ hasText: /^Vyrovnáno$/ })).toBeVisible()
    })

    await step(mobileWindow, "9/9 · Jana se vrací ke své přihlášce — S2-13, S2-14", async () => {
      await mobile.goto("/")
      await mobile
        .getByRole("heading", {
          name: "Přihlášky, ubytování a platby pro vaše akce na jednom místě",
          level: 1,
        })
        .waitFor({ state: "visible" })
      await mobileFits()
      await mobile
        .getByRole("region", { name: "Kudy dál" })
        .getByRole("link", { name: "Moje přihlášky", exact: true })
        .click()
      if (isRemote) {
        await type(mobile.getByLabel("E-mail"), participant.email)
        await mobile.getByRole("button", { name: "Poslat přihlašovací odkaz" }).click()
        await openMobileSignInLink(
          mobileWindow,
          mobile,
          process.env.E2E_BASE_URL ?? "http://localhost:3050",
        )
        // The received link opens inside the centered participant frame.
        await expect(
          mobile
            .getByRole("link", { name: `Detail přihlášky ${eventName}` })
            .and(mobile.locator(`[href="/my-registrations/${registrationId}"]`)),
        ).toBeVisible({ timeout: 180_000 })
      } else {
        await mobile.goto(
          `/my-registrations/verify?token=${await createMagicLink(participant.email)}`,
        )
      }
      await mobile
        .getByRole("link", { name: `Detail přihlášky ${eventName}` })
        .and(mobile.locator(`[href="/my-registrations/${registrationId}"]`))
        .click()
      await expect(definition(mobile, "Zaplaceno")).toHaveText("2 500 Kč")
      await mobileFits()
    })
    await endDemo(mobileWindow)
  } finally {
    await mobileContext.close()
  }
})
