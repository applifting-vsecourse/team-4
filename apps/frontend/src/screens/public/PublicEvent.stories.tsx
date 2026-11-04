import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import { PUBLIC_ID } from "@/features/public-events/fixtures/publicEvent"

const meta = {
  title: "Screens/Public/PublicEvent",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}/registration` },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Registration form of an event with open registration, linking to its detail (S2-06, S2-07, F55). */
export const PublicEvent: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Letní tábor Modrá Hora 2027")(context)
    const back = within(context.canvasElement).getByRole("link", { name: "Zpět na detail akce" })
    await expect(back).toHaveAttribute("href", `/e/${PUBLIC_ID}`)
  },
}

/** "Jiná odpověď" opens a field for the participant's own words (F64). */
export const OwnGenderAnswer: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Letní tábor Modrá Hora 2027")(context)
    const canvas = within(context.canvasElement)
    const words = { name: "Vlastní odpověď (nepovinné)" }
    await expect(canvas.queryByRole("textbox", words)).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("radio", { name: "Jiná odpověď" }))
    await userEvent.type(canvas.getByRole("textbox", words), "nebinární")
    await expect(canvas.getByRole("textbox", words)).toHaveValue("nebinární")
  },
}
