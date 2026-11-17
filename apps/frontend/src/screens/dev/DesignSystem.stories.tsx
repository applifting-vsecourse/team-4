import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { authHandlers } from "@/features/auth/fixtures/handlers"

const meta = {
  title: "Screens/Dev/Design system",
  ...screenMeta,
  args: { url: "/design-system" },
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** The kit, the shared components and tokens in one page; development builds only (#79). */
export const DesignSystem: StoryObj<typeof meta> = {
  play: showsHeading("akc.io design system"),
}
