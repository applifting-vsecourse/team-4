import type { Meta, StoryObj } from "@storybook/react-vite"

import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Organization/NewOrganization",
  ...screenMeta,
  args: { url: "/organizations/new" },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Creating an organization (S2-02). */
export const NewOrganization: StoryObj<typeof meta> = { play: showsHeading("Založit organizaci") }
