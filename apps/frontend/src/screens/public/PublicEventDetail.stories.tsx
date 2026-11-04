import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import { PUBLIC_ID } from "@/features/public-events/fixtures/publicEvent"

const meta = {
  title: "Screens/Public/PublicEventDetail",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}` },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Catalog detail of a published event with open registration (F55). */
export const PublicEventDetail: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogDetail())
  },
  play: showsHeading("Letní tábor Modrá Hora 2027"),
}

/** Unpublished or unknown event: no event data, a way back to the catalog. */
export const Unavailable: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogUnavailable())
  },
  play: showsHeading("Akce není dostupná"),
}

/** Loading failed: an error with retry, not a missing event. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogFailed())
  },
  play: showsHeading("Detail akce se nepodařilo načíst"),
}
