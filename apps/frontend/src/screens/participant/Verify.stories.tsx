import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"

const SESSION = "/participant/session"
const INVALID_LINK =
  "Odkaz už není platný: byl použit, vypršel nebo není správný. Vyžádejte si nový."

const meta = {
  title: "Screens/Participant/Verify",
  ...screenMeta,
  args: { url: "/my-registrations/verify?token=odkaz-z-e-mailu" },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** The link from the e-mail is being exchanged for the session. */
export const Verifying: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", SESSION))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent("Ověřujeme váš odkaz…")
  },
}

/** A used, expired or wrong link: the reason and the form for a new one. */
export const InvalidLink: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", SESSION, 400))
  },
  play: () => showsText(INVALID_LINK),
}

/** Opened without a token at all: the same as an invalid link. */
export const NoToken: Story = {
  args: { url: "/my-registrations/verify" },
  play: () => showsText(INVALID_LINK),
}
