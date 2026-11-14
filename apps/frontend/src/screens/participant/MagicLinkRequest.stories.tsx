import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import {
  MAGIC_LINK_SENT,
  participantHandlers,
} from "@/features/participant-access/fixtures/handlers"

const MAGIC_LINKS = "/participant/magic-links"

const meta = {
  title: "Screens/Participant/MagicLinkRequest",
  ...screenMeta,
  args: { url: "/my-registrations" },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedOut(), ...participantHandlers.magicLinkSent())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

async function askForLink({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.type(await canvas.findByLabelText("E-mail"), "tereza.novakova@example.cz")
  await userEvent.click(canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
}

/** Asking for a sign-in link, without a participant session (S2-13). */
export const MagicLinkRequest: Story = { play: showsHeading("Moje přihlášky") }

export const ValidationError: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Poslat přihlašovací odkaz" }))
    await showsText("Zadejte e-mail.")
  },
}

export const Sending: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", MAGIC_LINKS))
  },
  play: async (context) => {
    await askForLink(context)
    await expect(
      context.canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" }),
    ).toBeDisabled()
  },
}

/** The same confirmation whether the e-mail has a registration or not. */
export const Sent: Story = {
  play: async (context) => {
    await askForLink(context)
    await showsText(MAGIC_LINK_SENT)
  },
}

export const SendFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", MAGIC_LINKS))
  },
  play: async (context) => {
    await askForLink(context)
    await showsText("Odkaz se nepodařilo vyžádat. Zkuste to prosím znovu.")
  },
}
