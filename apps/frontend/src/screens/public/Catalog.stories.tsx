import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

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

/**
 * Filters combined from the URL: every one of them must match (F54-2b). The
 * search starts empty, so typing narrows the filtered list further.
 */
export const FilterCombination: Story = {
  args: { url: "/events?place=praha&open=true" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    await expect(canvas.getByRole("searchbox", { name: "Hledat akci" })).toHaveValue("")
    await expect(canvas.getByLabelText("Místo")).toHaveValue("praha")
    await expect(
      canvas.getByRole("switch", { name: "Pouze akce s otevřeným přihlašováním" }),
    ).toBeChecked()
    await expect(
      await canvas.findByRole("link", { name: "Příměstský tábor Město hrou" }),
    ).toHaveAttribute("href", "/e/mesto-hrou-2027")
    for (const name of ["Letní tábor Modrá Hora 2027", "Podzimní víkend pro mladé organizátory"]) {
      await expect(canvas.queryByRole("link", { name })).not.toBeInTheDocument()
    }
  },
}

/**
 * The switch hides published events whose registration is not open. The check
 * turns it off again, so the story ends on the whole catalog, ready to search.
 */
export const OnlyOpenRegistration: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    const notOpen = "Podzimní víkend pro mladé organizátory"
    await expect(await canvas.findByRole("link", { name: notOpen })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Zrušit filtry" })).not.toBeInTheDocument()
    const panel = canvas.getByRole("search", { name: "Hledání akcí" })
    const height = panel.getBoundingClientRect().height
    const onlyOpen = canvas.getByRole("switch", { name: "Pouze akce s otevřeným přihlašováním" })
    await userEvent.click(onlyOpen)
    await waitFor(() =>
      expect(canvas.queryByRole("link", { name: notOpen })).not.toBeInTheDocument(),
    )
    await expect(
      canvas.getByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    // The clear button appears and goes away without moving the results.
    await expect(await canvas.findByRole("button", { name: "Zrušit filtry" })).toBeVisible()
    await expect(panel.getBoundingClientRect().height).toBe(height)

    await userEvent.click(onlyOpen)
    await expect(await canvas.findByRole("link", { name: notOpen })).toBeInTheDocument()
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Zrušit filtry" })).not.toBeInTheDocument(),
    )
    await expect(panel.getBoundingClientRect().height).toBe(height)
  },
}

/**
 * A one-day period matches an event whose term shares that day (here the first
 * day of Turnus 2). The end cannot be picked before the start.
 */
export const PeriodFilter: Story = {
  args: { url: "/events?from=2027-08-01&to=2027-08-01" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    await expect(
      await canvas.findByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    for (const name of ["Příměstský tábor Město hrou", "Podzimní víkend pro mladé organizátory"]) {
      await expect(canvas.queryByRole("link", { name })).not.toBeInTheDocument()
    }

    await userEvent.click(canvas.getByRole("button", { name: "Termín do" }))
    const body = within(context.canvasElement.ownerDocument.body)
    await expect(await body.findByRole("grid")).toBeInTheDocument()
    const day = (date: string) =>
      context.canvasElement.ownerDocument.querySelector(`td[data-day="${date}"] button`)
    await expect(day("2027-07-31")).toBeDisabled()
    await expect(day("2027-08-01")).toBeEnabled()
    // Closed again, so the story ends on the page and not on the calendar.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("grid")).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        context.canvasElement.ownerDocument.querySelector("[data-slot=popover-content]"),
      ).toBeNull(),
    )
  },
}

/** Events are published, but none matches: a zero result that clears everything. */
export const NoMatch: Story = {
  args: { url: "/events?q=lyzovani&open=true" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const noMatch = await canvas.findByText("Hledání a filtrům neodpovídá žádná akce")
    await expect(canvas.queryByText("Zatím žádné veřejné akce")).not.toBeInTheDocument()
    const emptyState = within(noMatch.closest("[data-slot=empty]") ?? canvasElement)
    await userEvent.click(emptyState.getByRole("button", { name: "Zrušit filtry" }))
    await expect(
      await canvas.findByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    for (const name of ["Příměstský tábor Město hrou", "Podzimní víkend pro mladé organizátory"]) {
      await expect(canvas.getByRole("link", { name })).toBeInTheDocument()
    }
    await expect(canvas.getByRole("searchbox", { name: "Hledat akci" })).toHaveValue("")
    await expect(
      canvas.getByRole("switch", { name: "Pouze akce s otevřeným přihlašováním" }),
    ).not.toBeChecked()
  },
}

/** A retry after a failed load keeps the filters; the search starts empty. */
export const RetryKeepsFilters: Story = {
  args: { url: "/events?place=hlinsko" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListFailedOnce())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Katalog se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Zkusit znovu" }))
    await expect(
      await canvas.findByRole("textbox", { name: "Místo" }, { timeout: 5000 }),
    ).toHaveValue("hlinsko")
    await expect(
      canvas.getByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    await expect(
      canvas.queryByRole("link", { name: "Podzimní víkend pro mladé organizátory" }),
    ).not.toBeInTheDocument()
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
