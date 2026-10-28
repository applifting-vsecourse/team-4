import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"

const meta = {
  title: "Screens/Participant/MyRegistrationDetail",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}` },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedIn(), ...registrationHandlers.own())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** One own registration with payment instructions and payments (S2-14). */
export const MyRegistrationDetail: StoryObj<typeof meta> = {
  play: showsHeading("Letní tábor Modrá Hora 2027"),
}
