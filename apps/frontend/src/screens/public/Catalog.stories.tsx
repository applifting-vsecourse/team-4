import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"

const meta = {
  title: "Screens/Public/Catalog",
  ...screenMeta,
  args: { url: "/events" },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Published events of all organizations; each card leads to its detail (F54-2a). */
export const Catalog: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    const link = await canvas.findByRole("link", { name: "Letní tábor Modrá Hora 2027" })
    await expect(link).toHaveAttribute("href", "/e/letni-tabor-2027")
    await expect(canvas.getByText("Spolek Modrá Hora")).toBeInTheDocument()
    await expect(canvas.getByText(/Turnus 1: 4\. 7\. – 17\. 7\. 2027/)).toBeInTheDocument()
  },
}

/** No event is published. */
export const NoPublishedEvents: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListEmpty())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Zatím žádné veřejné akce")).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: "Zpět na úvodní stránku" })).toBeInTheDocument()
  },
}

/** Loading failed: an error with retry, not an empty catalog. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListFailed())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Katalog se nepodařilo načíst")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
    await expect(canvas.queryByText("Zatím žádné veřejné akce")).not.toBeInTheDocument()
  },
}
