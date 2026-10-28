import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import { PUBLIC_ID } from "@/features/public-events/fixtures/publicEvent"

const meta = {
  title: "Screens/Public/PublicEvent",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}` },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Public page of an event with open registration and the registration form (S2-06, S2-07). */
export const PublicEvent: StoryObj<typeof meta> = {
  play: showsHeading("Letní tábor Modrá Hora 2027"),
}
