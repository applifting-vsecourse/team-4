import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { authHandlers } from "@/features/auth/fixtures/handlers"

const meta = {
  title: "Screens/Public/Signup",
  ...screenMeta,
  args: { url: "/signup" },
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Organizer registration (S2-02). */
export const Signup: StoryObj<typeof meta> = { play: showsHeading("Registrace organizátora") }
