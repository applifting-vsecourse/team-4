import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"

const meta = {
  title: "Screens/Participant/MagicLinkRequest",
  ...screenMeta,
  args: { url: "/my-registrations" },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Asking for a sign-in link, without a participant session (S2-13). */
export const MagicLinkRequest: StoryObj<typeof meta> = { play: showsHeading("Moje přihlášky") }
