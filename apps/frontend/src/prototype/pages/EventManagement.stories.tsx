import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, within } from "storybook/test"

import { MOCK_API } from "@/prototype/mockBackend/handlers"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import {
  DARK,
  DESKTOP,
  expectToast,
  fill,
  knownIssues,
  MOBILE,
  prototypeMeta,
  screenOf,
  urls,
  waitForOverlaysToClose,
} from "@/prototype/prototypeStories"

// Správa akce: overview, settings (details, terms, payments, opening the
// registration), editing and accommodation (S2-04–S2-06, S2-09, S2-10, S2-17).
// Jana is signed in; the demo has an open, a ready and an incomplete event.
const meta = {
  ...prototypeMeta,
  title: "Pages/Organizer/Event management",
  args: { ...prototypeMeta.args, organizer: "jana", route: urls.event(DEMO.summerCamp) },
  globals: DESKTOP,
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

export const Overview: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: DEMO.summerCamp.name })).toBeVisible()
    await expect(canvas.getAllByText("Přihlašování otevřeno").length).toBeGreaterThan(0)
  },
}

export const OverviewMobile: Story = { globals: MOBILE }

export const OverviewDark: Story = { globals: { ...DESKTOP, ...DARK } }

/** No term yet: the next step leads to the terms section (S2-17). */
export const OverviewWithoutTerms: Story = {
  args: { route: urls.event(DEMO.winterCamp) },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Tato akce zatím nemá žádný termín.")).toBeVisible()
    await userEvent.click(canvas.getByRole("link", { name: "Přidat termín" }))
    await expect(await canvas.findByRole("heading", { name: "Termíny a ceny" })).toBeVisible()
  },
}

export const NewEvent: Story = {
  args: { route: urls.newEvent(DEMO.rosa.id) },
  play: async ({ canvas, userEvent }) => {
    await fill(userEvent, await canvas.findByRole("main"), {
      "Název akce": "Jarní brigáda",
      Místo: "Klubovna Rosa",
      Popis: "Úklid tábořiště a oprava chatek před sezónou.",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Vytvořit akci" }))
    await expect(await canvas.findByRole("heading", { name: "Jarní brigáda" })).toBeVisible()
    await expect(canvas.getByText("Tato akce zatím nemá žádný termín.")).toBeVisible()
  },
}

export const NewEventValidation: Story = {
  args: { route: urls.newEvent(DEMO.rosa.id) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Vytvořit akci" }))
    await expect(await canvas.findByText("Vyplňte název akce.")).toBeVisible()
    await expect(canvas.getByText("Vyplňte místo.")).toBeVisible()
    await expect(canvas.getByText("Vyplňte popis.")).toBeVisible()
  },
}

export const NewEventMobile: Story = {
  args: { route: urls.newEvent(DEMO.rosa.id) },
  globals: MOBILE,
}

/** Saving returns to the settings. */
export const EditEvent: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/edit") },
  parameters: knownIssues("successToastContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const main = await canvas.findByRole("main")
    await within(main).findByDisplayValue(DEMO.winterCamp.name)
    await fill(userEvent, main, { Místo: "Špindlerův Mlýn" })
    await userEvent.click(canvas.getByRole("button", { name: "Uložit změny" }))
    await expectToast(canvasElement, "Změny akce byly uloženy.")
    await expect(await canvas.findByText("Špindlerův Mlýn")).toBeVisible()
  },
}

/** From the first opening on, details, terms and prices are locked. */
export const EditLockedEvent: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/edit") },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Zpět na nastavení" })).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Uložit změny" })).toBeNull()
  },
}

/** What is missing before opening, each with the way to fix it. */
export const SettingsIncomplete: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/settings") },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Bez platebního nastavení nelze otevřít přihlašování"),
    ).toBeVisible()
    await expect(canvas.getByText("Alespoň jeden termín s cenou")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Otevřít přihlašování" })).toBeDisabled()
  },
}

export const SettingsIncompleteMobile: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/settings") },
  globals: MOBILE,
}

export const SettingsIncompleteDark: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/settings") },
  globals: { ...DESKTOP, ...DARK },
}

/** All conditions met: opening locks the event and publishes the link (S2-06). */
export const OpenRegistration: Story = {
  args: { route: urls.event(DEMO.hike, "/settings") },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Otevřít přihlašování" }))
    await expect(await canvas.findByText("Přihlašování je otevřené")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Upravit akci" })).toBeNull()
  },
}

/** An open event: terms read-only, payment settings still editable. */
export const SettingsOfOpenEvent: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/settings") },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Přihlašování je otevřené")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: /Upravit termín/ })).toBeNull()
    await expect(canvas.getByLabelText("Číslo účtu")).toBeEnabled()
  },
}

export const AddTermDialog: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/settings") },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Přidat termín" }))
    const dialog = await screenOf(canvasElement).findByRole("dialog", { name: "Nový termín" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit termín" }))
    await expect(await within(dialog).findByText("Vyplňte označení.")).toBeVisible()
    await expect(within(dialog).getByText("Vyberte datum začátku.")).toBeVisible()
  },
}

/** The account number is checked with the ČNB checksum by the server. */
export const InvalidBankAccount: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/settings") },
  play: async ({ canvas, userEvent }) => {
    await fill(userEvent, await canvas.findByRole("main"), {
      "Číslo účtu": "1234567890",
      "Kód banky": "0800",
      "Počet dní do připomenutí platby": "14",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Uložit platební nastavení" }))
    await expect(await canvas.findByText("Číslo účtu není platné, zkontrolujte ho.")).toBeVisible()
  },
}

export const SavePaymentSettings: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/settings") },
  parameters: knownIssues("successToastContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, await canvas.findByRole("main"), {
      "Číslo účtu": "2000145399",
      "Kód banky": "0800",
      "Počet dní do připomenutí platby": "14",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Uložit platební nastavení" }))
    await expectToast(canvasElement, "Platební nastavení bylo uloženo.")
    await expect(canvas.getByText(/Číslo účtu a počet dní/)).toHaveTextContent("splněno")
  },
}

/** Capacity comes from beds; 2. turnus is full and has two waiting (S2-10). */
export const Accommodation: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/rooms") },
  play: async ({ canvas }) => {
    const occupancy = await canvas.findByRole("region", { name: "Obsazenost po termínech" })
    const second = within(occupancy).getByRole("row", { name: /2\. turnus/ })
    await expect(
      within(second)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual([expect.stringContaining("2. turnus"), "4", "4", "0", "2"])
  },
}

export const AccommodationMobile: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/rooms") },
  globals: MOBILE,
  parameters: knownIssues("tableScrollKeyboard"),
}

export const AccommodationDark: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/rooms") },
  globals: { ...DESKTOP, ...DARK },
}

export const AccommodationWithoutTerms: Story = {
  args: { route: urls.event(DEMO.winterCamp, "/rooms") },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Zatím žádné pokoje")).toBeVisible()
  },
}

export const AddRoom: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/rooms") },
  parameters: knownIssues("successToastContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Přidat pokoj" }))
    const dialog = await screenOf(canvasElement).findByRole("dialog", { name: "Nový pokoj" })
    await fill(userEvent, dialog, { Označení: "Chatka Jezevec", "Počet lůžek": "3" })
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /2\. turnus/ }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit" }))
    await expectToast(canvasElement, "Pokoj byl přidán.")
    await waitForOverlaysToClose(canvasElement)
    const occupancy = await canvas.findByRole("region", { name: "Obsazenost po termínech" })
    await expect(
      await within(occupancy).findByRole("row", { name: /2\. turnus/ }),
    ).toHaveTextContent(/7.*4.*3.*2/)
  },
}

/** A room change may not leave fewer beds than confirmed participants. */
export const CapacityBelowConfirmed: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/rooms") },
  parameters: knownIssues("destructiveAlertContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Upravit pokoj Chatka Liška" }))
    const dialog = await screenOf(canvasElement).findByRole("dialog", { name: "Upravit pokoj" })
    await fill(userEvent, dialog, { "Počet lůžek": "1" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit" }))
    await expect(
      await within(dialog).findByText(/Kapacita nesmí klesnout pod potvrzenou účast/),
    ).toBeVisible()
  },
}

/** A missing and a foreign event look the same (S2-03). */
export const EventNotFound: Story = {
  args: { route: urls.event({ organizationId: DEMO.rosa.id, id: DEMO.missing }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Záznam není dostupný")).toBeVisible()
  },
}

export const EventLoadError: Story = {
  parameters: knownIssues("destructiveAlertContrast"),
  beforeEach: ({ msw }) => {
    msw.use(http.get(MOCK_API.event, () => HttpResponse.json({}, { status: 500 })))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Akci se nepodařilo načíst")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
  },
}
