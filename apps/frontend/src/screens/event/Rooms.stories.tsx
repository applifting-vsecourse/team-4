import type { Meta, StoryObj } from "@storybook/react-vite"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Rooms",
  ...screenMeta,
  args: { url: eventUrl("/rooms") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Rooms, beds and occupancy per term (S2-05, S2-10). */
export const Rooms: StoryObj<typeof meta> = { play: showsHeading("Pokoje") }
