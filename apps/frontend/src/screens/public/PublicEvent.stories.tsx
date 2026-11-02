import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import { PUBLIC_ID } from "@/features/public-events/fixtures/publicEvent"

const meta = {
  title: "Screens/Public/PublicEvent",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}/registration` },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Registration form of an event with open registration, linking to its detail (S2-06, S2-07, F55). */
export const PublicEvent: StoryObj<typeof meta> = {
  play: showsHeading("Letní tábor Modrá Hora 2027"),
}
