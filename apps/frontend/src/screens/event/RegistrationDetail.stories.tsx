import type { Meta, StoryObj } from "@storybook/react-vite"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

import { makeRegistrationDetail } from "@/features/registrations/fixtures/registrations"

const REGISTRATION_ID = makeRegistrationDetail().id

const meta = {
  title: "Screens/Event/RegistrationDetail",
  ...screenMeta,
  args: { url: eventUrl(`/registrations/${REGISTRATION_ID}`) },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** One registration with its payments (S2-11, S2-12). */
export const RegistrationDetail: StoryObj<typeof meta> = { play: showsHeading("Anna Nováková") }
