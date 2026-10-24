import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import {
  DESKTOP,
  dock,
  expectToast,
  fill,
  knownIssues,
  prototypeMeta,
  screenOf,
  urls,
  waitForOverlaysToClose,
} from "@/prototype/prototypeStories"

// Whole journeys through the app, several screens each, switching between
// the organizer and a participant with the prototype controls. Every step is
// a labelled group in the Interactions panel; pause, rewind and step through
// it there, or turn the play off and click on from any point.
const meta = {
  ...prototypeMeta,
  title: "Workflows/Organizer and participant",
  args: { ...prototypeMeta.args, organizer: "jana", hasToolbar: true },
  globals: DESKTOP,
  // The workflows end on screens with success toasts.
  parameters: { ...prototypeMeta.parameters, ...knownIssues("successToastContrast") },
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Participant = { firstName: string; lastName: string; email: string }

/** Registers on the public form that is on screen. */
async function register(
  user: Parameters<NonNullable<Story["play"]>>[0]["userEvent"],
  canvasElement: HTMLElement,
  terms: RegExp[],
  participant: Participant,
) {
  const canvas = within(canvasElement)
  for (const term of terms) await user.click(await canvas.findByRole("checkbox", { name: term }))
  await fill(user, canvasElement, {
    Jméno: participant.firstName,
    Příjmení: participant.lastName,
    "E-mail": participant.email,
    Telefon: "+420 777 123 456",
  })
  await user.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
  return canvas.findByRole("region", { name: "Přihláška je uložená" })
}

const ONDREJ = { firstName: "Ondřej", lastName: "Veselý", email: "ondrej.vesely@example.cz" }

/**
 * The whole loop of one registration: the organizer opens a ready event, a
 * participant registers on its public link, the organizer records the
 * payment, and the participant sees it settled in "Moje přihlášky".
 */
export const FromOpeningToPaid: Story = {
  args: { route: urls.event(DEMO.hike, "/settings") },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const page = screenOf(canvasElement)

    await step("Organizer: open the registration", async () => {
      await userEvent.click(await canvas.findByRole("button", { name: "Otevřít přihlašování" }))
      await expect(await canvas.findByText("Přihlašování je otevřené")).toBeVisible()
    })

    await step("Participant: register on the public link", async () => {
      await dock.jumpTo(userEvent, canvasElement, DEMO.hike.name)
      const result = await register(userEvent, canvasElement, [/Víkend/], ONDREJ)
      await expect(within(result).getByText("Potvrzeno")).toBeVisible()
    })

    await step("Organizer: the new registration is in the list, unpaid", async () => {
      await dock.visit(userEvent, canvasElement, urls.event(DEMO.hike, "/registrations"))
      const row = await canvas.findByRole("link", { name: "Otevřít přihlášku Ondřej Veselý" })
      await expect(within(canvas.getByRole("table")).getByText("Nezaplaceno")).toBeVisible()
      await userEvent.click(row)
    })

    await step("Organizer: record the payment", async () => {
      await userEvent.click(await canvas.findByRole("button", { name: "Zaznamenat platbu" }))
      const dialog = await page.findByRole("dialog", { name: "Zaznamenat platbu" })
      await fill(userEvent, dialog, { "Přijatá částka (Kč)": "1200" })
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit platbu" }))
      await expectToast(canvasElement, "Platba 1 200 Kč zaznamenána")
      await waitForOverlaysToClose(canvasElement)
      await expect(await canvas.findByText("Zaplaceno")).toBeVisible()
    })

    await step("Participant: sign in with a magic link and see it paid", async () => {
      await dock.jumpTo(userEvent, canvasElement, "Participant: Moje přihlášky")
      await fill(userEvent, canvasElement, { "E-mail": ONDREJ.email })
      await userEvent.click(canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
      await canvas.findByRole("status")
      await dock.openLatestEmail(userEvent, canvasElement)
      await userEvent.click(
        await canvas.findByRole("link", { name: `Detail přihlášky ${DEMO.hike.name}` }),
      )
      const payments = await canvas.findByText("Přijaté platby")
      await expect(payments).toBeVisible()
      await expect(canvas.queryByText("Variabilní symbol")).toBeNull()
    })
  },
}

/**
 * Capacity comes from beds, and each term decides on its own when the
 * application is saved: 2. turnus is full, so a participant waits; a room
 * added for it gives the next one a bed.
 */
export const LastBedAndWaitlist: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/rooms") },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const page = screenOf(canvasElement)
    // Capacity, confirmed, free beds, waitlisted; retried until refetched.
    const expectSecondTerm = (counts: [number, number, number, number]) =>
      waitFor(async () => {
        const occupancy = await canvas.findByRole("region", { name: "Obsazenost po termínech" })
        const row = within(occupancy).getByRole("row", { name: /2\. turnus/ })
        const cells = within(row)
          .getAllByRole("cell")
          .map((cell) => cell.textContent)
        await expect(cells.slice(1)).toEqual(counts.map(String))
      })

    await step("Organizer: 2. turnus is full, two are waiting", async () => {
      await expectSecondTerm([4, 4, 0, 2])
    })

    await step("Participant: registers for 2. turnus and waits", async () => {
      await dock.jumpTo(userEvent, canvasElement, DEMO.summerCamp.name)
      const result = await register(userEvent, canvasElement, [/2\. turnus/], {
        firstName: "Lucie",
        lastName: "Bartošová",
        email: "lucie.bartosova@example.cz",
      })
      await expect(within(result).getByText("Náhradník")).toBeVisible()
      await dock.back(userEvent, canvasElement)
    })

    await step("Organizer: refresh the counts, then add a room for 2. turnus", async () => {
      // The counts are read on demand (S2-10).
      await userEvent.click(await canvas.findByRole("button", { name: "Aktualizovat" }))
      await expectSecondTerm([4, 4, 0, 3])
      await userEvent.click(canvas.getByRole("button", { name: "Přidat pokoj" }))
      const dialog = await page.findByRole("dialog", { name: "Nový pokoj" })
      await fill(userEvent, dialog, { Označení: "Chatka Jezevec", "Počet lůžek": "2" })
      await userEvent.click(within(dialog).getByRole("checkbox", { name: /2\. turnus/ }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit" }))
      await expectToast(canvasElement, "Pokoj byl přidán.")
      await waitForOverlaysToClose(canvasElement)
      await expectSecondTerm([6, 4, 2, 3])
    })

    await step("Participant: the next one gets a bed", async () => {
      await dock.jumpTo(userEvent, canvasElement, DEMO.summerCamp.name)
      const result = await register(userEvent, canvasElement, [/2\. turnus/], {
        firstName: "Marek",
        lastName: "Kučera",
        email: "marek.kucera@example.cz",
      })
      await expect(within(result).getByText("Potvrzeno")).toBeVisible()
      await dock.back(userEvent, canvasElement)
    })

    await step("Organizer: one bed left, the waitlist unchanged", async () => {
      await userEvent.click(await canvas.findByRole("button", { name: "Aktualizovat" }))
      await expectSecondTerm([6, 5, 1, 3])
    })
  },
}

/** Organizations are isolated: another organizer's event is not reachable by its URL. */
export const IsolationBetweenOrganizations: Story = {
  args: { route: ROUTES.organizations },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    await step("Jana's own organizations", async () => {
      await expect(await canvas.findByRole("list", { name: "Vaše organizace" })).toBeVisible()
    })

    await step("Petr's event, opened by its URL, looks like a missing one", async () => {
      await dock.visit(userEvent, canvasElement, urls.event(DEMO.robotics))
      await expect(await canvas.findByText("Záznam není dostupný")).toBeVisible()
      await expect(canvas.queryByText(DEMO.robotics.name)).toBeNull()
    })

    await step("The way back leads to Jana's own events", async () => {
      await userEvent.click(canvas.getByRole("link", { name: "Zpět na přehled akcí" }))
      await expect(await canvas.findByRole("heading", { name: "Akce a turnusy" })).toBeVisible()
    })
  },
}
