import type { Meta, StoryObj } from "@storybook/react-vite"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Overview",
  ...screenMeta,
  args: { url: eventUrl() },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Management of one event with open registration (S2-04). */
export const Overview: StoryObj<typeof meta> = { play: showsHeading("Letní tábor Modrá Hora 2027") }
