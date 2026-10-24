import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { DEMO } from "@/prototype/mockBackend/scenarios"
import { dock, fill, MOBILE, prototypeMeta, urls } from "@/prototype/prototypeStories"

// Whole journeys through the app, several screens each. Every step is a
// labelled group in the Interactions panel; pause, rewind and step through it
// there, or turn the play off and click on from any point.
const meta = {
  ...prototypeMeta,
  title: "Workflows/Participant",
  args: { ...prototypeMeta.args, hasToolbar: true },
  // Participants come from a link on their phone.
  globals: MOBILE,
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const INVALID_LINK =
  "Odkaz už není platný: byl použit, vypršel nebo není správný. Vyžádejte si nový."

/**
 * From the organizer's link to "Moje přihlášky": one application with a
 * confirmed and a waitlisted term, the magic link from the mailbox, the own
 * registrations, and a link that works only once.
 */
export const RegisterAndComeBack: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    await step(
      "Choose both terms: the price of the selection, not yet the amount due",
      async () => {
        await userEvent.click(await canvas.findByRole("checkbox", { name: /1\. turnus/ }))
        await userEvent.click(canvas.getByRole("checkbox", { name: /2\. turnus/ }))
        await expect(canvas.getByText("9 000 Kč")).toBeVisible()
      },
    )

    await step("Fill in the contact details and send", async () => {
      await fill(userEvent, canvasElement, {
        Jméno: "Petra",
        Příjmení: "Malá",
        "E-mail": "petra.mala@example.cz",
        Telefon: "+420 777 123 456",
      })
      await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
    })

    await step("1. turnus has a bed, 2. turnus is full: confirmed and waitlisted", async () => {
      const result = await canvas.findByRole("region", { name: "Přihláška je uložená" })
      await expect(within(result).getByText("Potvrzeno")).toBeVisible()
      await expect(within(result).getByText("Náhradník")).toBeVisible()
      // Only the confirmed term is due, to the new variable symbol.
      await expect(within(result).getByText("1000062")).toBeVisible()
    })

    await step("Ask for a sign-in link", async () => {
      await userEvent.click(canvas.getByRole("link", { name: "Moje přihlášky" }))
      await fill(userEvent, canvasElement, { "E-mail": "petra.mala@example.cz" })
      await userEvent.click(canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
      await expect(await canvas.findByRole("status")).toBeVisible()
    })

    await step("Open the e-mail in the prototype's mailbox", async () => {
      await dock.openLatestEmail(userEvent, canvasElement)
      await expect(
        await canvas.findByRole("link", { name: `Detail přihlášky ${DEMO.summerCamp.name}` }),
      ).toBeVisible()
    })

    await step("Open the registration", async () => {
      await userEvent.click(
        canvas.getByRole("link", { name: `Detail přihlášky ${DEMO.summerCamp.name}` }),
      )
      await expect(await canvas.findByRole("heading", { name: DEMO.summerCamp.name })).toBeVisible()
      await expect(canvas.getByText("Zatím nebyla zaznamenána žádná platba.")).toBeVisible()
    })

    await step("The link works only once", async () => {
      await dock.openLatestEmail(userEvent, canvasElement)
      await expect(await canvas.findByText(INVALID_LINK)).toBeVisible()
    })
  },
}
