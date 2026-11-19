import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import { CATALOG_EVENT, PUBLIC_ID } from "@/features/public-events/fixtures/publicEvent"

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

/** Published before registration opens: the detail says so instead of the form link. */
export const RegistrationNotOpen: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.catalogDetail({ ...CATALOG_EVENT, registrationStatus: "not-open" }),
    )
  },
  play: () => showsText("Registrace zatím není otevřená"),
}

export const RegistrationClosed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.catalogDetail({ ...CATALOG_EVENT, registrationStatus: "closed" }),
    )
  },
  play: () => showsText("Registrace je uzavřená"),
}

/** Open, but without a term: nobody can register yet. */
export const NoTerms: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogDetail({ ...CATALOG_EVENT, terms: [] }))
  },
  play: () => showsText("Zatím se nelze přihlásit"),
}

/** No photos and no public contact: those sections are left out. */
export const NoPhotosNoContact: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogDetail({ ...CATALOG_EVENT, photos: [], contact: null }))
  },
  play: async (context) => {
    await showsHeading(CATALOG_EVENT.name)(context)
    await expect(context.canvas.queryByText(CATALOG_EVENT.contact!.email)).not.toBeInTheDocument()
  },
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
