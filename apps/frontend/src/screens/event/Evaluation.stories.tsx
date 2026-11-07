import type { Meta, StoryObj } from "@storybook/react-vite"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Evaluation",
  ...screenMeta,
  args: { url: eventUrl("/registrations?view=evaluation") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Přihlášky → Vyhodnocení: the current proposal of Turnus 1 with its queues and order (S3-01). */
export const Evaluation: StoryObj<typeof meta> = { play: showsHeading("Pořadí") }
