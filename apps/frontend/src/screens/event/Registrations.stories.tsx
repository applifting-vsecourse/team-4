import type { Meta, StoryObj } from "@storybook/react-vite"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Registrations",
  ...screenMeta,
  args: { url: eventUrl("/registrations") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Registrations of an event with filters (S2-11). */
export const Registrations: StoryObj<typeof meta> = { play: showsHeading("Seznam přihlášek") }
