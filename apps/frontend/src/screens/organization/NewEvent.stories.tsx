import type { Meta, StoryObj } from "@storybook/react-vite"

import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const meta = {
  title: "Screens/Organization/NewEvent",
  ...screenMeta,
  args: { url: `/organizations/${ORGANIZATION.id}/events/new` },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Creating an event (S2-04). */
export const NewEvent: StoryObj<typeof meta> = { play: showsHeading("Nová akce") }
