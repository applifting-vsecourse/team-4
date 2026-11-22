import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

import { closeDb, createMagicLink } from "./support/db"
import { contextOptions, endDemo, isDemo, step, type } from "./support/demo"
import { moveDemoCursor, moveDemoCursorTo } from "./support/demo-cursor"
import {
  createMobileStage,
  MOBILE_VIEWPORT,
  openMobileSignInLink,
  openParticipantSession,
  participantApiURL,
} from "./support/mobile-stage"
import { isRecording, RECORDING_SIZE } from "./support/recording"

const DEMO_EMAIL = "team4vse@seznam.cz"
const DEMO_PASSWORD = "akcio-demo-2026"
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3050"
const FIO_CSV = fileURLToPath(
  new URL("../../../apps/backend/prisma/demo/fio-vypis-tabor.csv", import.meta.url),
)

test.afterAll(closeDb)

test("Sprint Review 4 · přihláška, platba a pokoje @demo", async ({ page, browser }) => {
  test.setTimeout(isDemo ? 0 : 300_000)
  page.context().setDefaultTimeout(15_000)
  page.context().setDefaultNavigationTimeout(30_000)

  const mobileContext = await browser.newContext({
    ...contextOptions,
    baseURL: BASE_URL,
    viewport: isRecording ? RECORDING_SIZE : isDemo ? null : MOBILE_VIEWPORT,
  })
  mobileContext.setDefaultTimeout(15_000)
  let campHref = ""
  let campRegistrationHref = ""

  try {
    const mobileUrl = (path: string) => new URL(path, BASE_URL).href
    const isLocalDemo = new URL(BASE_URL).hostname === "localhost"
    if (isLocalDemo) {
      const token = await createMagicLink(DEMO_EMAIL)
      await openParticipantSession(mobileContext, token, BASE_URL)
    } else {
      const requested = await mobileContext.request.post(
        participantApiURL("participant/magic-links", BASE_URL),
        {
          data: { email: DEMO_EMAIL },
        },
      )
      if (!requested.ok()) throw new Error("Adamův přihlašovací odkaz se nepodařilo vyžádat.")
    }

    const { window: mobileWindow, content: mobile } = await createMobileStage(
      mobileContext,
      BASE_URL,
      "/e/lipa-kurz",
    )
    await page.goto("/login")
    await type(page.getByLabel("E-mail"), DEMO_EMAIL)
    await type(page.getByLabel("Heslo"), DEMO_PASSWORD)
    await page.getByRole("button", { name: "Přihlásit se" }).click()
    await expect(page.getByRole("heading", { name: "Akce a turnusy" })).toBeVisible()

    // Remote rehearsal uses a presenter-pasted mailbox link; exchange it via
    // the API so the projected mobile screen stays on the public course.
    if (!isLocalDemo) {
      await openMobileSignInLink(mobileWindow, mobile, BASE_URL)
    }
    if (!isDemo) await mobile.goto(mobileUrl("/e/lipa-kurz"))
    await expect(mobile.getByRole("link", { name: "Vyplnit přihlášku" })).toBeVisible()

    await page.goto("/organizations")
    await expect(page.getByRole("heading", { name: "Akce a turnusy" })).toBeVisible()
    const courseHref = await page
      .getByRole("link", { name: "Kurz první pomoci", exact: true })
      .getAttribute("href")
    campHref =
      (await page
        .getByRole("link", { name: "Tábor v Jizerkách", exact: true })
        .getAttribute("href")) ?? ""
    if (!courseHref || !campHref) throw new Error("V obnovené sadě chybí kurz nebo tábor.")

    await step(page, "1 · Veřejný kurz a Adamova přihláška", async () => {
      await page.goto(courseHref + "/settings")
      const access = page.getByRole("button", { name: "Veřejný přístup" })
      if ((await access.getAttribute("aria-expanded")) !== "true") await access.click()
      await expect(page.getByText(/otevřen/i).first()).toBeVisible()
      await expect(page.getByText(/storno/i).first()).toBeVisible()
      await page.waitForTimeout(1_000)

      await mobile.goto(mobileUrl("/e/lipa-kurz"))
      await mobile.getByRole("link", { name: "Vyplnit přihlášku" }).click()
      if (isDemo) {
        const cursor = mobileWindow.locator("#e2e-demo-cursor")
        await expect(cursor).toBeVisible()
        const scriptedPosition = await cursor.evaluate((element) => [
          element.style.left,
          element.style.top,
        ])
        // A separate user pointer move must not steer the scripted overlay.
        await mobileWindow.mouse.move(32, 40)
        expect(await cursor.evaluate((element) => [element.style.left, element.style.top])).toEqual(
          scriptedPosition,
        )
      }
      await expect(mobile.getByLabel("Jméno")).toHaveValue("Adam")
      await expect(mobile.getByLabel("Příjmení")).toHaveValue("Král")
      await expect(mobile.getByLabel("Telefon")).toHaveValue("601 000 001")
      await mobile.getByRole("checkbox").first().check()
      await expect(mobile.getByText("650 Kč").first()).toBeVisible()
      await mobile.getByRole("button", { name: "Zobrazit podmínky" }).click()
      await expect(mobile.getByText(/storno/i).first()).toBeVisible()
      await mobile
        .getByRole("checkbox", { name: /Potvrzuji, že jsem si přečetl\/a podmínky účasti/ })
        .check()
      await mobile.getByRole("button", { name: "Odeslat přihlášku" }).click()
      await expect(mobile.getByRole("heading", { name: /přihláška/i }).first()).toBeVisible()
      await mobileWindow.waitForTimeout(2_000)
    })

    await step(page, "2 · Fio výpis a Adamovo oznámení", async () => {
      await page.goto(campHref + "/payments")
      const importButton = page.getByRole("button", { name: "Import výpisu" })
      const importInput = page.getByLabel("Soubor s výpisem")
      await moveDemoCursor(importButton)
      await importButton.click()
      await importInput.setInputFiles(FIO_CSV)
      await expect(page.getByText("Výpis byl naimportován")).toBeVisible()
      const balances = page.getByRole("region", { name: "Tabulka sald přihlášek" })
      await expect(balances.getByRole("row", { name: /Adam Král/ })).toContainText("0 Kč")
      const payments = page.getByRole("region", { name: "Tabulka přijatých plateb" })
      await expect(
        payments
          .getByRole("row")
          .filter({ hasText: "2 500 Kč" })
          .filter({ hasText: "Adam" })
          .first(),
      ).toBeVisible()

      await mobile.goto(mobileUrl("/my-notifications"))
      await expect(mobile.getByRole("heading", { name: "Oznámení" })).toBeVisible()
      await expect(mobile.getByRole("main").getByText("Přijatá platba").first()).toBeVisible()
      await expect(mobile.getByRole("main").getByText("Tábor v Jizerkách").first()).toBeVisible()
    })

    await step(page, "3 · Přání, zámek a návrh pokojů", async () => {
      await mobile.goto(mobileUrl("/my-registrations"))
      await mobile.getByRole("link", { name: "Detail přihlášky Tábor v Jizerkách" }).click()
      campRegistrationHref = mobile.url()
      await mobile.getByRole("heading", { name: "Ubytování" }).waitFor()
      await mobile.getByRole("button", { name: "Vybrat spolubydlící" }).click()
      const form = mobile.getByRole("form", { name: "Výběr spolubydlících" })
      await form.getByRole("button", { name: "Přidat spolubydlícího" }).click()
      const picker = mobile.getByRole("dialog", { name: "Přidat spolubydlícího" })
      await picker.getByRole("option", { name: "Filip Veselý" }).click()
      await mobileWindow.keyboard.press("Escape")
      await form.getByRole("button", { name: "Uložit" }).click()
      await expect(mobile.getByText("Přání na spolubydlící je uložené")).toBeVisible()

      await page.goto(campHref + "/settings")
      const rules = page.getByRole("button", { name: "Pravidla ubytování" })
      if ((await rules.getAttribute("aria-expanded")) !== "true") await rules.click()
      await expect(page.getByText(/pohlaví/i).first()).toBeVisible()
      const preferences = page.getByRole("button", { name: "Návrh pokojů" })
      if ((await preferences.getAttribute("aria-expanded")) !== "true") await preferences.click()
      await expect(page.getByText("Přání", { exact: true })).toBeVisible()
      await page.goto(campHref + "/rooms")
      await page.getByRole("tab", { name: "Rozdělení" }).click()
      await page
        .getByRole("tablist", { name: "Termín" })
        .getByRole("tab", { name: /2\. turnus/ })
        .click()
      const saved = page.getByRole("region", { name: "Uložené rozdělení" })
      const buk = saved.getByRole("region", { name: "Pokoj Chatka Buk" })
      const bukTrigger = buk.getByRole("button").first()
      if ((await bukTrigger.getAttribute("aria-expanded")) !== "true") await bukTrigger.click()
      const attic = saved.getByRole("region", { name: "Pokoj Podkroví hlavní budovy" })
      const atticTrigger = attic.getByRole("button").first()
      if ((await atticTrigger.getAttribute("aria-expanded")) !== "true") await atticTrigger.click()
      const petr = buk.locator("li").filter({ hasText: "Petr Svoboda" }).first()
      const atticBox = await attic.boundingBox()
      if (!atticBox) throw new Error("Podkroví není v rozdělení viditelné.")
      await moveDemoCursor(petr)
      await page.mouse.down()
      await moveDemoCursorTo(
        page,
        atticBox.x + atticBox.width / 2,
        atticBox.y + atticBox.height / 2,
        32,
      )
      await page.waitForTimeout(500)
      await page.mouse.up()
      await expect(page.getByText("Umístění bylo uloženo.").first()).toBeVisible()
      const movedPetr = attic.getByRole("button", { name: "Akce: Petr Svoboda" })
      await movedPetr.click()
      await page.getByRole("menuitem", { name: "Zamknout umístění" }).click()
      await expect(attic.getByRole("img", { name: "Zamčené umístění" })).toBeVisible()

      const proposal = page.getByRole("region", { name: "Návrh pokojů" })
      await proposal.getByRole("button", { name: "Navrhnout pokoje" }).click()
      await expect(proposal.getByText("Aktuální návrh", { exact: true })).toBeVisible({
        timeout: 45_000,
      })
      await proposal.getByRole("button", { name: "Zobrazit návrh" }).click()
      await expect(proposal.getByRole("row").filter({ hasText: "Petr Svoboda" })).toContainText(
        "Podkroví hlavní budovy",
      )
      await proposal.getByRole("button", { name: "Použít návrh" }).click()
      const apply = page.getByRole("dialog", { name: "Použít návrh pokojů" })
      await apply.getByRole("button", { name: "Použít návrh" }).click()
      await expect(page.getByText("Návrh pokojů byl použit.")).toBeVisible()
      if ((await atticTrigger.getAttribute("aria-expanded")) !== "true") await atticTrigger.click()
      await expect(attic.getByText("Petr Svoboda")).toBeVisible()
      await expect(attic.getByRole("img", { name: "Zamčené umístění" })).toBeVisible()
    })

    await step(page, "4 · Zveřejnění prvního turnusu", async () => {
      await page
        .getByRole("tablist", { name: "Termín" })
        .getByRole("tab", { name: /1\. turnus/ })
        .click()
      const saved = page.getByRole("region", { name: "Uložené rozdělení" })
      const publish = saved.getByRole("switch", { name: "Zveřejnit rozdělení" })
      await publish.click()
      await expect(page.getByText("Rozdělení je zveřejněné účastníkům.")).toBeVisible()

      await mobile.goto(mobileUrl(campRegistrationHref))
      await mobile.goto(mobileUrl(campRegistrationHref))
      await expect(mobile.getByText("Chatka Buk")).toBeVisible()
      const wish = mobile.getByRole("listitem").filter({ hasText: "Filip Veselý" })
      await expect(wish.getByText("Splněno")).toBeVisible()
      await mobileWindow.waitForTimeout(4_000)
    })

    await endDemo(page)
  } finally {
    await mobileContext.close()
  }
})
