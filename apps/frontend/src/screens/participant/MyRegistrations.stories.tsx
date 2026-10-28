import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"

const meta = {
  title: "Screens/Participant/MyRegistrations",
  ...screenMeta,
  args: { url: "/my-registrations" },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedIn(), ...registrationHandlers.own())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** The verified participant's registrations (S2-14). */
export const MyRegistrations: StoryObj<typeof meta> = {
  play: showsHeading("Jarní výlet na Sněžku"),
}
