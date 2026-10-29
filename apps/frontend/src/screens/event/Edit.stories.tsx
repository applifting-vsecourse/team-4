import type { Meta, StoryObj } from "@storybook/react-vite"

import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

import { DRAFT_EVENT } from "@/features/events/fixtures/events"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const meta = {
  title: "Screens/Event/Edit",
  ...screenMeta,
  args: { url: `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/edit` },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Editing an event still in preparation (S2-04). */
export const Edit: StoryObj<typeof meta> = { play: showsHeading("Upravit akci") }
