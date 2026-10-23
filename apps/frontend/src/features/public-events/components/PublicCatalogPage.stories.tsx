import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { PublicCatalogPage } from "@/features/public-events/components/PublicCatalogPage"
import { CATALOG_EVENTS } from "@/features/public-events/fixtures/catalog"

// Mock UI for F54-2 (#64): the public catalog with filters. Not wired to an
// API or a route yet; the page filters its `events` prop locally.
const meta = {
  component: PublicCatalogPage,
  args: { events: CATALOG_EVENTS },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PublicCatalogPage>

export default meta

type Story = StoryObj<typeof meta>

const cardCount = (root: HTMLElement) =>
  within(root).queryAllByRole("link", { name: /^Detail akce/ }).length

export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(cardCount(canvasElement)).toBe(CATALOG_EVENTS.length)

    await step("filter by age group", async () => {
      await userEvent.click(canvas.getByRole("combobox", { name: "Věk" }))
      await userEvent.click(await page.findByRole("option", { name: "Dospělí 18+" }))
      await expect(await canvas.findByRole("status")).toHaveTextContent("2 akce")
      await expect(cardCount(canvasElement)).toBe(2)
    })

    await step("combine with region", async () => {
      await userEvent.click(await canvas.findByRole("combobox", { name: "Místo" }))
      await userEvent.click(await page.findByRole("option", { name: "Jihočeský kraj" }))
      await expect(await canvas.findByRole("status")).toHaveTextContent("1 akce")
      await expect(cardCount(canvasElement)).toBe(1)
      await expect(await canvas.findByText("Vodácký týden na Vltavě")).toBeVisible()
    })

    await step("remove one chip, then clear all", async () => {
      await userEvent.click(
        await canvas.findByRole("button", { name: "Zrušit filtr Jihočeský kraj" }),
      )
      await expect(cardCount(canvasElement)).toBe(2)
      await userEvent.click(canvas.getByRole("button", { name: "Vymazat vše" }))
      await expect(cardCount(canvasElement)).toBe(CATALOG_EVENTS.length)
    })
  },
}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile360" } },
}

/** The filter sheet on a phone, with the result count on its button. */
export const MobileFilters: Story = {
  globals: { viewport: { value: "mobile360" } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: /^Filtry/ }))
    const sheet = await page.findByRole("dialog", { name: "Filtry" })
    await userEvent.click(within(sheet).getByRole("combobox", { name: "Termín" }))
    await userEvent.click(await page.findByRole("option", { name: "září 2027" }))
    await expect(
      await within(sheet).findByRole("button", { name: "Zobrazit 1 akce" }),
    ).toBeVisible()
  },
}

export const NoMatch: Story = {
  args: { defaultFilter: { region: "Praha", ageGroup: "adult" } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvas.getByText("Filtrům neodpovídá žádná akce.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Vymazat filtry" }))
    await expect(cardCount(canvasElement)).toBe(CATALOG_EVENTS.length)
  },
}

export const NoPublishedEvents: Story = {
  args: { events: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Zatím tu nejsou žádné zveřejněné akce.")).toBeVisible()
    await expect(canvas.queryByRole("combobox")).toBeNull()
  },
}

export const Loading: Story = {
  args: { events: undefined, isLoading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status", { name: "Načítání akcí" })).toBeVisible()
  },
}

export const Dark: Story = {
  globals: { theme: "dark", viewport: { value: "desktop" } },
}

export const MobileDark: Story = {
  globals: { theme: "dark", viewport: { value: "mobile360" } },
}
