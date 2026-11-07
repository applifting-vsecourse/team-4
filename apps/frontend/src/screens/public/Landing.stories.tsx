import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"

const meta = {
  title: "Screens/Public/Landing",
  ...screenMeta,
  args: { url: "/" },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const catalogSection = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByRole("region", { name: "Kam se letos vydat?" }))

// Every way in stays available, whatever the catalog holds (F58).
const keepsWaysIn = async ({ canvasElement }: Pick<StoryContext, "canvasElement">) => {
  const entries = within(canvasElement).getByRole("navigation", { name: "Vstup do aplikace" })
  await expect(within(entries).getByRole("link", { name: "Katalog akcí" })).toHaveAttribute(
    "href",
    "/events",
  )
  await expect(within(entries).getByRole("link", { name: "Moje přihlášky" })).toHaveAttribute(
    "href",
    "/my-registrations",
  )
  await expect(within(entries).getByRole("link", { name: "Organizátor" })).toHaveAttribute(
    "href",
    "/login",
  )
  await expect(
    catalogSection(canvasElement).getByRole("link", { name: "Celý katalog" }),
  ).toHaveAttribute("href", "/events")
  const main = within(within(canvasElement).getByRole("main"))
  await expect(main.getByRole("link", { name: "Více pro organizátory" })).toHaveAttribute(
    "href",
    "/for-organizers",
  )
  await expect(main.getByRole("link", { name: "Více pro účastníky" })).toHaveAttribute(
    "href",
    "/for-participants",
  )
}

const showsCards = (count: number) => async (context: StoryContext) => {
  await showsHeading("Akce bez chaosu")(context)
  const section = catalogSection(context.canvasElement)
  await expect(await section.findAllByRole("heading", { level: 3 })).toHaveLength(count)
  await keepsWaysIn(context)
}

/** Landing page in the S3-T2 "Ticket stub" style, previewing the soonest catalog events (F58). */
export const Landing: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsCards(3)(context)
    const link = catalogSection(context.canvasElement).getByRole("link", {
      name: "Letní tábor Modrá Hora 2027",
    })
    await expect(link).toHaveAttribute("href", "/e/letni-tabor-2027")
  },
}

/** Two published events: two cards, no stagger. */
export const TwoCatalogEvents: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListOf(2))
  },
  play: showsCards(2),
}

/** A single published event. */
export const OneCatalogEvent: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListOf(1))
  },
  play: showsCards(1),
}

/** No published event: the section says so; the rest of the page is unchanged. */
export const EmptyCatalog: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListEmpty())
  },
  play: async (context) => {
    await showsHeading("Akce bez chaosu")(context)
    const section = catalogSection(context.canvasElement)
    await expect(await section.findByText("Zatím žádné veřejné akce")).toBeInTheDocument()
    await keepsWaysIn(context)
  },
}

/** The catalog failed to load: an error with retry, never an empty catalog. */
export const CatalogFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListFailed())
  },
  play: async (context) => {
    await showsHeading("Akce bez chaosu")(context)
    const section = catalogSection(context.canvasElement)
    await expect(
      await section.findByText("Akce se nepodařilo načíst", undefined, { timeout: 5000 }),
    ).toBeInTheDocument()
    await expect(section.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
    await expect(section.queryByText("Zatím žádné veřejné akce")).not.toBeInTheDocument()
    await keepsWaysIn(context)
  },
}
