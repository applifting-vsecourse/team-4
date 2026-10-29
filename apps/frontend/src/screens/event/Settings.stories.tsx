import type { Meta, StoryObj } from "@storybook/react-vite"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Settings",
  ...screenMeta,
  args: { url: eventUrl("/settings") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Terms, registration and payment settings of an event (S2-04, S2-06, S2-09). */
export const Settings: StoryObj<typeof meta> = { play: showsHeading("Termíny a ceny") }
