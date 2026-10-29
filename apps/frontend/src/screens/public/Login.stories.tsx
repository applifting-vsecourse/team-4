import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { authHandlers } from "@/features/auth/fixtures/handlers"

const meta = {
  title: "Screens/Public/Login",
  ...screenMeta,
  args: { url: "/login" },
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Organizer sign-in (S2-01). */
export const Login: StoryObj<typeof meta> = { play: showsHeading("Přihlášení organizátora") }
