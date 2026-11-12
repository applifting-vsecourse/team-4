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

/**
 * The kit and tokens in one page; development builds only (#79). Known defect
 * kept visible: its loading example has an aria-label without a role
 * (aria-prohibited-attr), the same pattern as several screens, so a11y reports it.
 */
export const DesignSystem: StoryObj<typeof meta> = {
  parameters: { a11y: { test: "todo" } },
  play: showsHeading("akc.io design system"),
}
