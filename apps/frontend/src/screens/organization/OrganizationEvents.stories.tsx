import type { Meta, StoryObj } from "@storybook/react-vite"

import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const meta = {
  title: "Screens/Organization/OrganizationEvents",
  ...screenMeta,
  args: { url: `/organizations/${ORGANIZATION.id}` },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** "Akce a turnusy": the events of one organization (S2-04). */
export const OrganizationEvents: StoryObj<typeof meta> = { play: showsHeading("Akce a turnusy") }
