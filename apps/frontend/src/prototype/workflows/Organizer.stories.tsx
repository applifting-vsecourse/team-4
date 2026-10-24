import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { ROUTES } from "@/app/routes"
import {
  DESKTOP,
  dock,
  expectToast,
  fill,
  knownIssues,
  pickableDates,
  pickDate,
  prototypeMeta,
  screenOf,
  waitForOverlaysToClose,
} from "@/prototype/prototypeStories"

// Whole journeys through the app, several screens each. Every step is a
// labelled group in the Interactions panel; pause, rewind and step through it
// there, or turn the play off and click on from any point.
const meta = {
  ...prototypeMeta,
  title: "Workflows/Organizer",
  args: { ...prototypeMeta.args, hasToolbar: true },
  globals: DESKTOP,
  // The workflow ends on screens with success toasts.
  parameters: { ...prototypeMeta.parameters, ...knownIssues("successToastContrast") },
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A new organizer, from the landing page to an event that takes
 * registrations: account, organization, event, term, room, payment details,
 * opening, and the public link the participants get.
 */
export const FirstEventFromScratch: Story = {
  args: { scenario: "blank", route: ROUTES.home },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const page = screenOf(canvasElement)
    const dates = pickableDates()

    await step("Landing page → organizer sign-up", async () => {
      const [organizer] = await canvas.findAllByRole("link", { name: "Organizátor" })
      await userEvent.click(organizer!)
      // Wait for each page before clicking on it: a link React has just removed
      // is followed by the browser itself, which would leave Storybook.
      await canvas.findByRole("heading", { name: "Přihlášení organizátora" })
      await userEvent.click(canvas.getByRole("link", { name: "Registrovat organizátora" }))
    })

    await step("Create the account", async () => {
      await fill(userEvent, canvasElement, {
        Jméno: "Martina Horáková",
        "E-mail": "martina@akcio.cz",
        Heslo: "bezpecne-heslo",
      })
      await userEvent.click(canvas.getByRole("button", { name: "Zaregistrovat se" }))
      await expect(await canvas.findByText("Zatím nemáte organizaci")).toBeVisible()
    })

    await step("Found the organization", async () => {
      await userEvent.click(canvas.getByRole("link", { name: "Založit organizaci" }))
      await fill(userEvent, canvasElement, { "Název organizace": "Pionýrská skupina Bobři" })
      await userEvent.click(canvas.getByRole("button", { name: "Založit organizaci" }))
      await expect(await canvas.findByText("Zatím žádné akce")).toBeVisible()
    })

    await step("Create the event", async () => {
      await userEvent.click(canvas.getByRole("link", { name: "Nová akce" }))
      await fill(userEvent, await canvas.findByRole("main"), {
        "Název akce": "Letní tábor Bobři",
        Místo: "Tábořiště Pod Skalou",
        Popis: "Týden v přírodě s hrami, výpravami a táborákem.",
      })
      await userEvent.click(canvas.getByRole("button", { name: "Vytvořit akci" }))
      await expect(await canvas.findByText("Tato akce zatím nemá žádný termín.")).toBeVisible()
    })

    await step("Add a term with a price", async () => {
      await userEvent.click(canvas.getByRole("link", { name: "Přidat termín" }))
      await canvas.findByRole("heading", { name: "Termíny a ceny" })
      await userEvent.click(canvas.getByRole("button", { name: "Přidat termín" }))
      const dialog = await page.findByRole("dialog", { name: "Nový termín" })
      await fill(userEvent, dialog, { Označení: "1. turnus", "Cena (Kč)": "3900" })
      await pickDate(userEvent, dialog, "Začátek", dates.start)
      await pickDate(userEvent, dialog, "Konec", dates.end)
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit termín" }))
      await expectToast(canvasElement, "Termín byl přidán.")
      await waitForOverlaysToClose(canvasElement)
      // Czech number formatting separates thousands with a no-break space.
      await expect(await canvas.findByRole("cell", { name: /^3\s900\sKč$/ })).toBeVisible()
    })

    await step("Add a room, which gives the term its beds", async () => {
      const [accommodation] = canvas.getAllByRole("link", { name: "Ubytování" })
      await userEvent.click(accommodation!)
      await canvas.findByRole("heading", { name: "Pokoje" })
      await userEvent.click(canvas.getByRole("button", { name: "Přidat pokoj" }))
      const dialog = await page.findByRole("dialog", { name: "Nový pokoj" })
      await fill(userEvent, dialog, { Označení: "Velká chata", "Počet lůžek": "20" })
      await userEvent.click(within(dialog).getByRole("checkbox", { name: /1\. turnus/ }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit" }))
      await expectToast(canvasElement, "Pokoj byl přidán.")
      await waitForOverlaysToClose(canvasElement)
      const occupancy = await canvas.findByRole("region", { name: "Obsazenost po termínech" })
      await expect(within(occupancy).getByRole("row", { name: /1\. turnus/ })).toHaveTextContent(
        /20.*0.*20.*0/,
      )
    })

    await step("Fill in the payment details", async () => {
      const [settings] = canvas.getAllByRole("link", { name: "Nastavení" })
      await userEvent.click(settings!)
      await canvas.findByRole("heading", { name: "Platební údaje" })
      await fill(userEvent, await canvas.findByRole("main"), {
        "Číslo účtu": "2000145399",
        "Kód banky": "0800",
        "Počet dní do připomenutí platby": "14",
      })
      await userEvent.click(canvas.getByRole("button", { name: "Uložit platební nastavení" }))
      await expectToast(canvasElement, "Platební nastavení bylo uloženo.")
    })

    await step("Open the registration", async () => {
      const open = canvas.getByRole("button", { name: "Otevřít přihlašování" })
      await expect(open).toBeEnabled()
      await userEvent.click(open)
      await expect(await canvas.findByText("Přihlašování je otevřené")).toBeVisible()
    })

    await step("Follow the public link a participant gets", async () => {
      await dock.jumpTo(userEvent, canvasElement, "Letní tábor Bobři")
      await expect(await canvas.findByRole("heading", { name: "Letní tábor Bobři" })).toBeVisible()
      await expect(canvas.getByRole("checkbox", { name: /1\. turnus/ })).toBeVisible()
    })
  },
}
