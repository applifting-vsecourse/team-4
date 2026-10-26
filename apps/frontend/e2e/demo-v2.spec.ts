import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { test, type Page } from "@playwright/test"

import { createOrganization, register, setUpEvent } from "./support/api"
import { closeDb, createMagicLink } from "./support/db"
import { contextOptions, endDemo, expect, isDemo, step, type } from "./support/demo"
import { EXTRA_VIDEO_DIR, isRecording } from "./support/recording"
import { definition, pickDate } from "./support/ui"

// Demo V2: the Sprint 2 stories in one walkthrough for the PO, through the
// real UI, API and database. S2-15 (the confirmation e-mail) is left out: the
// demo sends no e-mail. Each caption names the stories
// its step shows. It needs no seed data: the organizer signs up in the UI and
// the other organizer is prepared through the API.
//
// Four people, each in their own browser: Alena the organizer (`page`), Jana
// and Petr on a phone (`visitor`, 360 px wide) and an organizer of another
// association (`outsider`). No e-mail is sent or read: the participant's magic
// link is created in the database.
//
// `pnpm frontend demo:v2` steps through it, `pnpm frontend demo:v2:autoplay`
// plays it through.

const run = Date.now().toString(36)
const alena = {
  name: "Alena Pořadatelová",
  email: `alena-${run}@example.test`,
  password: "demo-heslo-123",
}
const jana = { firstName: "Jana", lastName: "Nováková", email: `jana-${run}@example.test` }
const petr = { firstName: "Petr", lastName: "Svoboda", email: `petr-${run}@example.test` }
const event = {
  name: "Kurz první pomoci",
  location: "Chata Rozvoj, Krkonoše",
  description: "Víkend nácviku první pomoci v terénu pro vedoucí oddílů.",
}
/** The S2-07 and S2-14 phone width. */
const PHONE = { width: 360, height: 800 }
const LINK_REFUSED =
  "Odkaz už není platný: byl použit, vypršel nebo není správný. Vyžádejte si nový."

let sceneNumber = 0

// Recording (DEMO_RECORD=1) saves one video per window. To cut them into one
// film, the timeline notes which window each scene shows and when, and when
// each window's video ended.
const RECORDING_DIR = fileURLToPath(new URL("../test-results/demo-v2-recording/", import.meta.url))
/** A recorded scene stays on screen this long after its last check, to be read. */
const SCENE_HOLD_MS = 2_500
const windowNames = new Map<Page, string>()
const timeline = {
  scenes: [] as { at: number; window: string; caption: string }[],
  windows: {} as Record<string, { video: string; closedAt: number }>,
}

/** A numbered step whose caption ends with the stories it presents. */
const scene = <T>(who: Page, title: string, stories: string[], body: () => Promise<T>) => {
  const caption = `${++sceneNumber} · ${title} — ${stories.join(", ")}`
  return step(who, caption, async () => {
    if (isRecording) {
      timeline.scenes.push({ at: Date.now(), window: windowNames.get(who)!, caption })
    }
    const result = await body()
    if (isRecording) await who.waitForTimeout(SCENE_HOLD_MS)
    return result
  })
}

/** Ends the recording of `page`'s window and saves its video under `name`. */
async function saveVideo(page: Page, name: string) {
  const recording = page.video()
  if (!recording) throw new Error(`Video recording is not enabled for the ${name} window`)
  mkdirSync(RECORDING_DIR, { recursive: true })
  const closedAt = Date.now()
  await page.close()
  const video = `${RECORDING_DIR}${name}.webm`
  await recording.saveAs(video)
  timeline.windows[name] = { video, closedAt }
}

/** S2-01, S2-07, S2-14: nothing wider than the window, so no sideways scrolling. */
async function expectNoSidewaysScroll(page: Page) {
  const isWithinWindow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
  expect(isWithinWindow, "page scrolls sideways").toBe(true)
}

test.afterAll(closeDb)

test("demo V2: Sprint 2 from the landing page to the participant's own view", async ({
  page,
  browser,
}) => {
  test.setTimeout(isDemo ? 0 : 300_000)
  windowNames.set(page, "organizer")

  // Another association's organizer with an open event, behind the scenes.
  const outsiderContext = await browser.newContext(contextOptions)
  const outsiderEvent = await setUpEvent(outsiderContext.request, {
    terms: [{ label: "Chata", startDate: "2027-06-01", endDate: "2027-06-03", priceMinor: 80000 }],
    rooms: [{ label: "Podkroví", bedCount: 4, terms: [0] }],
  })
  // Organization names are unique per organizer only: Alena may use this one too.
  await createOrganization(outsiderContext.request, "Spolek Jasan")

  // Every window opens now, loaded, so none pops up in the middle of the demo:
  // each stays behind until its first scene starts. Jana and Petr use a
  // phone: the public pages at 360 px.
  const visitorContext = await browser.newContext({
    ...contextOptions,
    viewport: PHONE,
    // Playwright records at most the page's own size; the film scales it up.
    ...(isRecording ? { recordVideo: { dir: EXTRA_VIDEO_DIR, size: PHONE } } : {}),
  })
  const visitor = await visitorContext.newPage()
  windowNames.set(visitor, "visitor")
  await visitor.goto("/")
  const outsider = await outsiderContext.newPage()
  windowNames.set(outsider, "outsider")
  await outsider.goto(`/organizations/${outsiderEvent.organizationId}`)

  // ── Act 1: a visitor becomes an organizer ─────────────────────────────────

  const entries = page.getByRole("region", { name: "Kudy dál" })

  await page.goto("/")
  await scene(page, "Landing page představí akc.io", ["S2-01"], async () => {
    await expect(
      page.getByRole("heading", {
        name: "Přihlášky, ubytování a platby pro vaše akce na jednom místě",
        level: 1,
      }),
    ).toBeVisible()
    for (const feature of ["Přihlášky po termínech", "Ubytování a kapacita", "Platby"]) {
      await expect(page.getByRole("heading", { name: feature, exact: true })).toBeVisible()
    }
    await expect(page.getByText(/kemp\.io/i)).toHaveCount(0)
  })

  await scene(
    page,
    "Dva oddělené vstupy: odkaz bez hesla, nebo heslo pořadatele",
    ["S2-01", "S2-02", "S2-13"],
    async () => {
      await entries.getByRole("link", { name: "Moje přihlášky" }).click()
      await expect(page.getByLabel("E-mail")).toBeVisible()
      await expect(page.getByLabel("Heslo")).toBeHidden()

      await page.goto("/")
      await entries.getByRole("link", { name: "Organizátor", exact: true }).click()
      await expect(page.getByRole("heading", { name: "Přihlášení organizátora" })).toBeVisible()
      await expect(page.getByLabel("Heslo")).toBeVisible()
    },
  )

  await scene(page, "Registrace: jen jméno, e-mail a heslo, chyby u polí", ["S2-02"], async () => {
    await page.getByRole("link", { name: "Registrovat organizátora" }).click()
    await page.getByRole("button", { name: "Zaregistrovat se" }).click()
    await expect(page.getByText("Zadejte jméno.")).toBeVisible()
    await expect(page.getByText("Zadejte e-mail.")).toBeVisible()
    await expect(page.getByText("Heslo musí mít alespoň 8 znaků.")).toBeVisible()

    await type(page.getByLabel("Jméno"), alena.name)
    await type(page.getByLabel("E-mail"), outsiderEvent.organizer.email)
    await type(page.getByLabel("Heslo"), "kratke")
    await page.getByRole("button", { name: "Zaregistrovat se" }).click()
    await expect(page.getByText("Heslo musí mít alespoň 8 znaků.")).toBeVisible()
  })

  await scene(page, "Použitý e-mail nevytvoří druhý účet", ["S2-02"], async () => {
    await type(page.getByLabel("Heslo"), alena.password)
    await page.getByRole("button", { name: "Zaregistrovat se" }).click()
    await expect(page.getByText("Účet s tímto e-mailem už existuje.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Přejít na přihlášení" })).toBeVisible()
  })

  await scene(
    page,
    "Po registraci je přihlášená a založí první organizaci",
    ["S2-02"],
    async () => {
      await type(page.getByLabel("E-mail"), alena.email)
      await page.getByRole("button", { name: "Zaregistrovat se" }).click()
      await expect(page.getByText("Zatím nemáte organizaci")).toBeVisible()

      await page.getByRole("link", { name: "Založit organizaci" }).click()
      await type(page.getByLabel("Název organizace"), "Spolek Jasan")
      await page.getByRole("button", { name: "Založit organizaci" }).click()
      await expect(page.getByRole("heading", { name: "Akce a turnusy", level: 1 })).toBeVisible()
      await expect(page.getByText("Zatím žádné akce")).toBeVisible()
    },
  )
  const jasanUrl = page.url()

  const switcher = page.getByRole("button", { name: "Přepnout organizaci" })

  await scene(
    page,
    "Druhá organizace; stejný název jinak napsaný se odmítne",
    ["S2-02"],
    async () => {
      await switcher.click()
      await page.getByRole("menuitem", { name: "Založit organizaci" }).click()
      await type(page.getByLabel("Název organizace"), " spolek jasan ")
      await page.getByRole("button", { name: "Založit organizaci" }).click()
      await expect(page.getByText("Organizace s tímto názvem už existuje.")).toBeVisible()
      await expect(page.getByLabel("Název organizace")).toHaveValue(" spolek jasan ")

      await type(page.getByLabel("Název organizace"), "Sportovní klub Modrá")
      await page.getByRole("button", { name: "Založit organizaci" }).click()
      await expect(page.getByRole("heading", { name: "Akce a turnusy", level: 1 })).toBeVisible()
      await expect(switcher).toContainText("Sportovní klub Modrá")
    },
  )
  const modraUrl = page.url()

  await scene(
    page,
    "Přepínač organizací; po obnovení stránky zůstane v téže",
    ["S2-02", "S2-03"],
    async () => {
      await switcher.click()
      await expect(page.getByRole("menuitem", { name: "Sportovní klub Modrá" })).toBeVisible()
      await page.getByRole("menuitem", { name: "Spolek Jasan" }).click()
      await expect(switcher).toContainText("Spolek Jasan")
      await page.reload()
      await expect(switcher).toContainText("Spolek Jasan")
      await expect(page).toHaveURL(jasanUrl)
    },
  )

  await scene(page, "Odhlášení, chybné heslo a nové přihlášení", ["S2-02"], async () => {
    await page.getByRole("button", { name: "Uživatelské menu" }).filter({ visible: true }).click()
    await page.getByRole("menuitem", { name: "Odhlásit se" }).click()
    await expect(page.getByRole("heading", { name: "Přihlášení organizátora" })).toBeVisible()

    await type(page.getByLabel("E-mail"), alena.email)
    await type(page.getByLabel("Heslo"), "spatne-heslo-123")
    await page.getByRole("button", { name: "Přihlásit se" }).click()
    await expect(page.getByText("Nesprávný e-mail nebo heslo.")).toBeVisible()
    await expect(page.getByLabel("E-mail")).toHaveValue(alena.email)

    await type(page.getByLabel("Heslo"), alena.password)
    await page.getByRole("button", { name: "Přihlásit se" }).click()
    // With two organizations the sign-in opens the choice between them.
    await page.getByRole("link", { name: /Spolek Jasan/ }).click()
    await expect(page.getByRole("heading", { name: "Akce a turnusy", level: 1 })).toBeVisible()
  })

  // ── Act 2: Alena prepares an event ────────────────────────────────────────

  await scene(page, "Nová akce: povinný název, místo a popis", ["S2-04"], async () => {
    await page.getByRole("link", { name: "Nová akce" }).first().click()
    await page.getByRole("button", { name: "Vytvořit akci" }).click()
    await expect(page.getByText("Vyplňte název akce.")).toBeVisible()
    await expect(page.getByText("Vyplňte místo.")).toBeVisible()
    await expect(page.getByText("Vyplňte popis.")).toBeVisible()

    await type(page.getByLabel("Název akce"), event.name)
    await type(page.getByLabel("Místo"), event.location)
    await type(page.getByLabel("Popis"), event.description)
    await page.getByRole("button", { name: "Vytvořit akci" }).click()
    await expect(page.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
    await expect(page.getByText("Koncept", { exact: true })).toBeVisible()
  })
  const eventUrl = page.url()

  await scene(page, "Akce bez termínu napoví další krok", ["S2-17"], async () => {
    await expect(page.getByText("Tato akce zatím nemá žádný termín.")).toBeVisible()
    await page.getByRole("link", { name: "Přidat termín" }).click()
    await expect(page.getByRole("heading", { name: "Termíny a ceny" })).toBeVisible()
    await expect(page.getByText("Zatím žádné termíny")).toBeVisible()
  })

  const addTerm = async (label: string, start: string, end: string, price: string) => {
    await page.getByRole("button", { name: "Přidat termín" }).click()
    const dialog = page.getByRole("dialog", { name: "Nový termín" })
    await type(dialog.getByLabel("Označení"), label)
    await pickDate(page, dialog.getByLabel("Začátek"), start)
    await pickDate(page, dialog.getByLabel("Konec"), end)
    await type(dialog.getByLabel("Cena (Kč)"), price)
    await dialog.getByRole("button", { name: "Uložit termín" }).click()
    return dialog
  }
  const termRow = (label: string) => page.getByRole("row", { name: new RegExp(label) })

  await scene(
    page,
    "Termíny s vlastní cenou, jednodenní termín je platný, kapacita se nezadává",
    ["S2-04"],
    async () => {
      await page.getByRole("button", { name: "Přidat termín" }).click()
      const dialog = page.getByRole("dialog", { name: "Nový termín" })
      await expect(dialog.getByLabel("Kapacita")).toHaveCount(0)
      await dialog.getByRole("button", { name: "Uložit termín" }).click()
      await expect(dialog.getByText("Vyplňte označení.")).toBeVisible()
      await expect(dialog.getByText("Zadejte cenu.")).toBeVisible()
      await dialog.getByRole("button", { name: "Zrušit" }).click()

      await expect(await addTerm("Sobota", "2027-05-15", "2027-05-15", "1000")).toBeHidden()
      await expect(termRow("Sobota")).toContainText("1 000 Kč")
      await expect(await addTerm("Neděle", "2027-05-16", "2027-05-16", "1500")).toBeHidden()
      await expect(termRow("Neděle")).toContainText("1 500 Kč")
    },
  )

  await scene(
    page,
    "Překryv termínů a cena na tři desetinná místa se neuloží",
    ["S2-04"],
    async () => {
      const dialog = await addTerm("Celý víkend", "2027-05-15", "2027-05-16", "12,345")
      await expect(dialog.getByText("Cena může mít nejvýše dvě desetinná místa.")).toBeVisible()
      await type(dialog.getByLabel("Cena (Kč)"), "2000")
      await dialog.getByRole("button", { name: "Uložit termín" }).click()
      await expect(dialog.getByText("Překrývá se s termínem „Sobota“.")).toBeVisible()
      await dialog.getByRole("button", { name: "Zrušit" }).click()
      await expect(termRow("Celý víkend")).toHaveCount(0)
    },
  )

  await scene(
    page,
    "Úprava termínu otevře uložené hodnoty, Zrušit nic nezmění",
    ["S2-04"],
    async () => {
      await page.getByRole("button", { name: "Upravit termín Neděle" }).click()
      const dialog = page.getByRole("dialog", { name: "Upravit termín" })
      await expect(dialog.getByLabel("Označení")).toHaveValue("Neděle")
      await type(dialog.getByLabel("Cena (Kč)"), "9999")
      await dialog.getByRole("button", { name: "Zrušit" }).click()
      await expect(termRow("Neděle")).toContainText("1 500 Kč")
    },
  )

  const openButton = page.getByRole("button", { name: "Otevřít přihlašování" })

  await scene(
    page,
    "Bez platebních údajů nejde přihlašování otevřít",
    ["S2-06", "S2-09"],
    async () => {
      await expect(
        page.getByText("Bez platebního nastavení nelze otevřít přihlašování"),
      ).toBeVisible()
      await expect(
        page.getByText("Číslo účtu a počet dní do připomenutí platby – chybí"),
      ).toBeVisible()
      await expect(openButton).toBeDisabled()
    },
  )

  await scene(page, "Platební údaje: neplatný účet se neuloží, platný ano", ["S2-09"], async () => {
    await type(page.getByLabel("Číslo účtu"), "1234567890")
    await type(page.getByLabel("Kód banky"), "0800")
    await type(page.getByLabel("Počet dní do připomenutí platby"), "14")
    await page.getByRole("button", { name: "Uložit platební nastavení" }).click()
    await expect(page.getByText("Číslo účtu není platné, zkontrolujte ho.")).toBeVisible()
    await expect(page.getByLabel("Číslo účtu")).toHaveValue("1234567890")

    await type(page.getByLabel("Číslo účtu"), "2000145399")
    await page.getByRole("button", { name: "Uložit platební nastavení" }).click()
    await expect(
      page.getByText("Číslo účtu a počet dní do připomenutí platby – splněno"),
    ).toBeVisible()
    await expect(openButton).toBeEnabled()
  })

  // The event's sections: tabs on the overview, the sidebar on the other pages.
  const eventNavigation = (name: string) =>
    page.getByRole("link", { name, exact: true }).filter({ visible: true }).first()
  const occupancy = page.getByRole("region", { name: "Obsazenost po termínech" })
  // Capacity, confirmed, free, waitlisted.
  const occupancyRow = (label: string, counts: string) =>
    occupancy.getByRole("row", { name: new RegExp(`${label} .* ${counts}$`) })

  await scene(
    page,
    "Pokoj s lůžky pro vybrané termíny; nulová lůžka a duplicitní označení se odmítnou",
    ["S2-05"],
    async () => {
      await eventNavigation("Ubytování").click()
      await expect(page.getByText("Zatím žádné pokoje")).toBeVisible()
      await page.getByRole("button", { name: "Přidat pokoj" }).click()
      const dialog = page.getByRole("dialog", { name: "Nový pokoj" })
      await type(dialog.getByLabel("Označení"), "Pokoj A")
      await type(dialog.getByLabel("Počet lůžek"), "0")
      await dialog.getByRole("checkbox", { name: /Sobota/ }).check()
      await dialog.getByRole("button", { name: "Uložit" }).click()
      await expect(dialog.getByText("Počet lůžek musí být alespoň 1.")).toBeVisible()
      await type(dialog.getByLabel("Počet lůžek"), "1")
      await dialog.getByRole("button", { name: "Uložit" }).click()
      await expect(dialog).toBeHidden()

      await page.getByRole("button", { name: "Přidat pokoj" }).click()
      await type(dialog.getByLabel("Označení"), " pokoj a ")
      await type(dialog.getByLabel("Počet lůžek"), "2")
      await dialog.getByRole("button", { name: "Uložit" }).click()
      await expect(dialog.getByText("Pokoj s tímto označením už v akci existuje.")).toBeVisible()
      await dialog.getByRole("button", { name: "Zrušit" }).click()
    },
  )

  await scene(
    page,
    "Kapacita termínu je součet lůžek dostupných pokojů",
    ["S2-05", "S2-10"],
    async () => {
      await expect(occupancyRow("Sobota", "1 0 1 0")).toBeVisible()
      await expect(occupancyRow("Neděle", "0 0 0 0")).toBeVisible()
      await expect(occupancy.getByText("Neděle nemá dostupná lůžka.")).toBeVisible()
    },
  )

  let publicUrl = ""
  await scene(page, "Veřejný odkaz je k dispozici už v konceptu", ["S2-06"], async () => {
    await eventNavigation("Nastavení").click()
    publicUrl = await page.getByLabel("Veřejný odkaz na přihlášku").inputValue()
    expect(publicUrl).toContain("/e/")
  })

  await scene(visitor, "Koncept ani neexistující odkaz nic neprozradí", ["S2-06"], async () => {
    await visitor.goto(publicUrl)
    await expect(visitor.getByText("Akce není dostupná")).toBeVisible()
    await expect(visitor.getByText(event.name)).toBeHidden()
    await expect(visitor.getByText(event.location)).toBeHidden()
    await visitor.goto("/e/neexistujici-akce")
    await expect(visitor.getByText("Akce není dostupná")).toBeVisible()
  })

  await scene(
    page,
    "Otevření přihlašování zamkne údaje akce, i po obnovení stránky",
    ["S2-06", "S2-04"],
    async () => {
      await expect(
        page.getByText("Otevřením přihlašování zamknete název, popis, místo, termíny a ceny."),
      ).toBeVisible()
      await openButton.click()
      await expect(page.getByText("Přihlašování je otevřené")).toBeVisible()
      await page.reload()
      await expect(
        page.getByText("Od otevření přihlašování jsou název, popis, místo, termíny a ceny zamčené"),
      ).toBeVisible()
      await expect(page.getByRole("link", { name: "Upravit akci" })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Upravit termín Sobota" })).toHaveCount(0)
      await expect(page.getByLabel("Veřejný odkaz na přihlášku")).toHaveValue(publicUrl)
    },
  )

  // ── Act 3: participants register on their phones ─────────────────────────

  const total = visitor.getByRole("region", { name: "Cena vybraných termínů" })
  const termBox = (label: string) => visitor.getByRole("checkbox", { name: new RegExp(label) })
  const fillContact = async (person: typeof jana, phone = "+420 777 123 456") => {
    await type(visitor.getByLabel("Jméno"), person.firstName)
    await type(visitor.getByLabel("Příjmení"), person.lastName)
    await type(visitor.getByLabel("E-mail"), person.email)
    await type(visitor.getByLabel("Telefon"), phone)
  }
  const submit = () => visitor.getByRole("button", { name: "Odeslat přihlášku" }).click()
  const result = visitor.getByRole("region", { name: "Přihláška je uložená" })
  const resultTerm = (label: string) => result.getByRole("listitem").filter({ hasText: label })

  await scene(
    visitor,
    "Veřejná přihláška na mobilu: termíny a ceny, žádné počty lůžek",
    ["S2-06", "S2-07"],
    async () => {
      await visitor.goto(publicUrl)
      await expect(visitor.getByRole("heading", { name: event.name })).toBeVisible()
      await expect(visitor.getByText(event.location)).toBeVisible()
      await expect(termBox("Sobota")).toBeVisible()
      await expect(termBox("Neděle")).toBeVisible()
      await expect(visitor.getByText(/lůžk|volná místa|náhradník/i)).toHaveCount(0)
      await expectNoSidewaysScroll(visitor)
    },
  )

  await scene(
    visitor,
    "Cena vybraných termínů se přepočítá; bez termínu nejde odeslat",
    ["S2-07"],
    async () => {
      await termBox("Sobota").check()
      await termBox("Neděle").check()
      await expect(total).toContainText("2 500 Kč")
      await termBox("Sobota").uncheck()
      await termBox("Neděle").uncheck()
      await expect(total).toContainText("0 Kč")
      await submit()
      await expect(visitor.getByText("Vyberte alespoň jeden termín.")).toBeVisible()
    },
  )

  await scene(
    visitor,
    "Telefon vyžaduje mezinárodní předvolbu, mezery nevadí",
    ["S2-07"],
    async () => {
      await termBox("Sobota").check()
      await termBox("Neděle").check()
      await fillContact(jana, "777123456")
      await submit()
      await expect(
        visitor.getByText("Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456."),
      ).toBeVisible()
      await expect(termBox("Neděle")).toBeChecked()
      await type(visitor.getByLabel("Telefon"), "+420 777 123 456")
    },
  )

  await scene(
    visitor,
    "Sobota potvrzena, Neděle náhradník; platí se jen potvrzený termín",
    ["S2-08", "S2-16", "S2-14"],
    async () => {
      await submit()
      await expect(resultTerm("Sobota")).toContainText("Potvrzeno")
      await expect(resultTerm("Neděle")).toContainText("Náhradník")
      await expect(definition(result, "Cena výběru")).toHaveText("2 500 Kč")
      await expect(definition(result, "K úhradě za potvrzené termíny")).toHaveText("1 000 Kč")
      await expect(definition(result, "Číslo účtu")).toHaveText("2000145399/0800")
      await expect(definition(result, "Variabilní symbol")).toHaveText(/\d+/)
      await expect(definition(result, "Datum připomenutí platby")).toContainText("(Europe/Prague)")
      await expectNoSidewaysScroll(visitor)
    },
  )

  await scene(
    visitor,
    "Stejný e-mail podruhé: nic nového, jen nabídka přihlašovacího odkazu",
    ["S2-08", "S2-14"],
    async () => {
      await visitor.goto(publicUrl)
      await termBox("Sobota").check()
      await fillContact(jana)
      await submit()
      await expect(visitor.getByText("Přihláška s tímto e-mailem již existuje")).toBeVisible()
      await expect(visitor.getByRole("link", { name: "Vyžádat přihlašovací odkaz" })).toBeVisible()
      await expect(result).toBeHidden()
    },
  )

  await scene(
    visitor,
    "Petr chce Sobotu, ale lůžko je obsazené: náhradník a nic neplatí",
    ["S2-08", "S2-14", "S2-16"],
    async () => {
      await visitor.goto(publicUrl)
      await termBox("Sobota").check()
      await fillContact(petr)
      await submit()
      await expect(resultTerm("Sobota")).toContainText("Náhradník")
      await expect(result.getByText("Nyní nemáte platební povinnost.")).toBeVisible()
      await expect(definition(result, "Datum připomenutí platby")).toHaveCount(0)
    },
  )

  // ── Act 4: Alena works with the registrations ─────────────────────────────

  await scene(
    page,
    "Obsazenost po termínech se načte tlačítkem Aktualizovat",
    ["S2-10"],
    async () => {
      await eventNavigation("Ubytování").click()
      await occupancy.getByRole("button", { name: "Aktualizovat" }).click()
      await expect(occupancyRow("Sobota", "1 1 0 1")).toBeVisible()
      await expect(occupancyRow("Neděle", "0 0 0 1")).toBeVisible()
    },
  )

  await scene(
    page,
    "Víc lůžek nepovýší náhradníka; volné lůžko je pro nové přihlášky",
    ["S2-05", "S2-10"],
    async () => {
      await page.getByRole("button", { name: "Upravit pokoj Pokoj A" }).click()
      const dialog = page.getByRole("dialog", { name: "Upravit pokoj" })
      await type(dialog.getByLabel("Počet lůžek"), "2")
      await dialog.getByRole("button", { name: "Uložit" }).click()
      await expect(dialog).toBeHidden()
      await occupancy.getByRole("button", { name: "Aktualizovat" }).click()
      await expect(occupancyRow("Sobota", "2 1 1 1")).toBeVisible()
    },
  )

  await scene(page, "Kapacita nesmí klesnout pod potvrzenou účast", ["S2-05"], async () => {
    await page.getByRole("button", { name: "Odstranit pokoj Pokoj A" }).click()
    const dialog = page.getByRole("dialog", { name: "Odstranit pokoj „Pokoj A“?" })
    await dialog.getByRole("button", { name: "Odstranit" }).click()
    await expect(dialog.getByText(/Termín „Sobota“.*Kapacita nesmí klesnout/)).toBeVisible()
    await dialog.getByRole("button", { name: "Zrušit" }).click()
    await expect(page.getByRole("row", { name: /Pokoj A/ })).toBeVisible()
  })

  const openRegistration = (person: typeof jana) =>
    page.getByRole("link", { name: `Otevřít přihlášku ${person.firstName} ${person.lastName}` })
  const registrationRow = (person: typeof jana) =>
    page.getByRole("row", { name: new RegExp(`${person.firstName} ${person.lastName}`) })

  await scene(
    page,
    "Přihlášky akce: stav po termínech a platba, od nejstarší",
    ["S2-11"],
    async () => {
      await eventNavigation("Přihlášky").click()
      const rows = page.getByRole("link", { name: /^Otevřít přihlášku/ })
      await expect(rows).toHaveCount(2)
      await expect(rows.first()).toHaveAccessibleName(/Jana Nováková/)
      await expect(registrationRow(jana)).toContainText("Potvrzeno")
      await expect(registrationRow(jana)).toContainText("Náhradník")
      await expect(registrationRow(jana)).toContainText("Nezaplaceno")
      await expect(registrationRow(petr)).toContainText("Bez povinnosti")
    },
  )

  const filter = async (name: string, option: string) => {
    await page.getByRole("combobox", { name, exact: true }).click()
    await page.getByRole("option", { name: option, exact: true }).click()
  }

  await scene(page, "Filtry: termín a stav musí sedět na tentýž termín", ["S2-11"], async () => {
    await filter("Termín", "Sobota")
    await filter("Stav účasti", "Náhradník")
    await expect(openRegistration(petr)).toBeVisible()
    await expect(openRegistration(jana)).toBeHidden()

    await filter("Termín", "Neděle")
    await expect(openRegistration(jana)).toBeVisible()
    await expect(openRegistration(petr)).toBeHidden()

    await filter("Platba", "Bez povinnosti")
    await expect(page.getByText("Žádná přihláška neodpovídá filtrům.")).toBeVisible()
    await page.getByRole("button", { name: "Zrušit filtry" }).first().click()
    await expect(page.getByRole("link", { name: /^Otevřít přihlášku/ })).toHaveCount(2)
  })

  let janaDetailUrl = ""
  let reminderDate = ""

  await scene(
    page,
    "Detail: povinnost za potvrzené termíny, VS a datum připomenutí",
    ["S2-11", "S2-16"],
    async () => {
      await openRegistration(jana).click()
      await expect(definition(page, "Cena vybraných termínů")).toHaveText("2 500 Kč")
      await expect(definition(page, "Částka za potvrzené termíny")).toHaveText("1 000 Kč")
      await expect(definition(page, "Přijato")).toHaveText("0 Kč")
      await expect(definition(page, "Dluh")).toHaveText("1 000 Kč")
      await expect(definition(page, "Variabilní symbol")).toHaveText(/\d+/)
      await expect(page.getByText("Zatím nebyla zaznamenána žádná platba.")).toBeVisible()
      reminderDate = await definition(page, "Datum připomenutí platby").innerText()
      janaDetailUrl = page.url()
    },
  )

  const recordPayment = async (amount: string) => {
    await page.getByRole("button", { name: "Zaznamenat platbu" }).click()
    const dialog = page.getByRole("dialog", { name: "Zaznamenat platbu" })
    await type(dialog.getByLabel("Přijatá částka (Kč)"), amount)
    await dialog.getByRole("button", { name: "Uložit platbu" }).click()
    await expect(dialog).toBeHidden()
  }
  const payments = page.getByRole("listitem").filter({ hasText: /Kč$/ })

  await scene(
    page,
    "Platby 600 + 400 + 200 Kč: dluh 400 Kč, vyrovnáno, přeplatek 200 Kč",
    ["S2-12"],
    async () => {
      await recordPayment("600")
      await expect(definition(page, "Přijato")).toHaveText("600 Kč")
      await expect(definition(page, "Dluh")).toHaveText("400 Kč")
      await recordPayment("400")
      await expect(page.locator("dt").filter({ hasText: /^Vyrovnáno$/ })).toBeVisible()
      await recordPayment("200")
      await expect(definition(page, "Přeplatek")).toHaveText("200 Kč")
      await expect(payments).toHaveCount(3)
    },
  )

  await scene(page, "Seznam přihlášek se po platbě obnoví sám", ["S2-11", "S2-12"], async () => {
    await eventNavigation("Přihlášky").click()
    await expect(registrationRow(jana)).toContainText("Přeplatek")
  })

  await scene(page, "Platba bez platební povinnosti je přeplatek", ["S2-12"], async () => {
    await openRegistration(petr).click()
    await recordPayment("300")
    await expect(definition(page, "Přeplatek")).toHaveText("300 Kč")
  })

  await scene(page, "Změna platebních údajů platí jen pro nové přihlášky", ["S2-09"], async () => {
    await eventNavigation("Nastavení").click()
    await expect(page.getByText("Změna platí jen pro nové přihlášky")).toBeVisible()
    await type(page.getByLabel("Počet dní do připomenutí platby"), "30")
    await page.getByRole("button", { name: "Uložit platební nastavení" }).click()
    await expect(page.getByText("Platební nastavení bylo uloženo.")).toBeVisible()

    await page.goto(janaDetailUrl)
    await expect(definition(page, "Datum připomenutí platby")).toHaveText(reminderDate)
  })

  // ── Act 5: Jana comes back later ──────────────────────────────────────────

  // Meanwhile Jana has also registered with the other association.
  const janaElsewhere = await register(
    outsiderContext.request,
    outsiderEvent.publicId,
    jana,
    outsiderEvent.termIds,
  )

  // Jana's magic link, stored the way the backend stores one: the demo sends
  // and reads no e-mail.
  const verifyUrl = `/my-registrations/verify?token=${await createMagicLink(jana.email)}`
  let janaOwnDetailUrl = ""

  await scene(
    visitor,
    "Přihlašovací odkaz otevře všechny její přihlášky, i u jiného pořadatele",
    ["S2-13", "S2-14"],
    async () => {
      await visitor.goto(verifyUrl)
      await expect(visitor.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
      await expect(
        visitor.getByRole("link", { name: `Detail přihlášky ${event.name}` }),
      ).toBeVisible()
      await expect(
        visitor.getByRole("link", { name: `Detail přihlášky ${outsiderEvent.name}` }),
      ).toBeVisible()
      await expectNoSidewaysScroll(visitor)
    },
  )

  await scene(
    visitor,
    "Detail ukáže stav termínů a platby, které zapsala pořadatelka",
    ["S2-14", "S2-12"],
    async () => {
      await visitor.getByRole("link", { name: `Detail přihlášky ${event.name}` }).click()
      await expect(visitor.getByRole("heading", { name: event.name, level: 1 })).toBeVisible()
      const term = (label: string) => visitor.getByRole("listitem").filter({ hasText: label })
      await expect(term("Sobota")).toContainText("Potvrzeno")
      await expect(term("Neděle")).toContainText("Náhradník")
      await expect(definition(visitor, "Zaplaceno")).toHaveText("1 200 Kč")
      await expect(definition(visitor, "Přeplatek")).toHaveText("200 Kč")
      await visitor.getByRole("button", { name: "Aktualizovat" }).click()
      await expect(definition(visitor, "Přeplatek")).toHaveText("200 Kč")
      janaOwnDetailUrl = visitor.url()
    },
  )

  await scene(
    visitor,
    "Po odhlášení nic soukromého; použitý odkaz už neplatí",
    ["S2-13"],
    async () => {
      const logout = visitor.getByRole("button", { name: "Odhlásit se" })
      await logout.click()
      // The logout request must finish before the next navigation could cancel it.
      await expect(logout).toBeHidden()
      await visitor.goto(janaOwnDetailUrl)
      await expect(visitor.getByRole("button", { name: "Poslat přihlašovací odkaz" })).toBeVisible()
      await expect(visitor.getByText("1 200 Kč")).toBeHidden()

      await visitor.goto(verifyUrl)
      await expect(visitor.getByText(LINK_REFUSED)).toBeVisible()
    },
  )

  // ── Act 6: the other association's organizer tries to look in ─────────────

  await scene(
    outsider,
    "Cizí pořadatel přímým odkazem nic neuvidí a vrátí se ke svým akcím",
    ["S2-03"],
    async () => {
      const unavailable = outsider.getByText("Záznam není dostupný", { exact: true })
      await outsider.goto(janaDetailUrl)
      await expect(unavailable).toBeVisible()
      await expect(outsider.getByText(jana.email)).toBeHidden()

      await outsider.goto(eventUrl)
      await expect(unavailable).toBeVisible()
      await expect(outsider.getByText(event.name)).toBeHidden()
      // Back to the first own organization by name.
      await outsider.getByRole("link", { name: "Zpět na přehled akcí" }).click()
      await expect(outsider).toHaveURL(new RegExp(`/organizations/${outsiderEvent.organizationId}`))
    },
  )

  await scene(page, "Podvržené ID v adrese neotevře záznam jiné akce", ["S2-03"], async () => {
    await page.goto(`${eventUrl}/registrations/${janaElsewhere.id}`)
    await expect(page.getByText("Záznam není dostupný", { exact: true })).toBeVisible()
    await expect(page.getByText(outsiderEvent.name)).toBeHidden()
  })

  await scene(page, "Dvě karty, dvě organizace: každá drží tu svou", ["S2-03"], async () => {
    const secondTab = await page.context().newPage()
    await secondTab.goto(modraUrl)
    await page.goto(jasanUrl)
    await secondTab.reload()
    await page.reload()
    await expect(secondTab.getByRole("button", { name: "Přepnout organizaci" })).toContainText(
      "Sportovní klub Modrá",
    )
    await expect(switcher).toContainText("Spolek Jasan")
    await expect(page.getByRole("link", { name: event.name })).toBeVisible()
    await expect(secondTab.getByText("Zatím žádné akce")).toBeVisible()
    await secondTab.close()
  })

  await endDemo(page)

  if (isRecording) {
    for (const [window, name] of windowNames) await saveVideo(window, name)
    writeFileSync(`${RECORDING_DIR}timeline.json`, JSON.stringify(timeline, null, 2))
  }
  await visitorContext.close()
  await outsiderContext.close()
})
