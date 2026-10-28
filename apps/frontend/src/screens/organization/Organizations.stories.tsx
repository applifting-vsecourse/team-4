import type { Meta, StoryObj } from "@storybook/react-vite"

import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Organization/Organizations",
  ...screenMeta,
  args: { url: "/organizations" },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** The organizer's organizations (S2-02). */
export const Organizations: StoryObj<typeof meta> = { play: showsHeading("Vyberte organizaci") }
