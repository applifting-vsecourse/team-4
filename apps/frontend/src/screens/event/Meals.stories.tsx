import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { refresh, showsText } from "@/screens/steps"

import { mealHandlers } from "@/features/meals/fixtures/handlers"
import { MEAL_OVERVIEW, MEAL_OVERVIEW_LONG } from "@/features/meals/fixtures/meals"

const MEALS = "/organizations/:organizationId/events/:eventId/meals/:termId"

const meta = {
  title: "Screens/Event/Meals",
  ...screenMeta,
  args: { url: eventUrl("/meals") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** From the selected event's management, Stravování opens the meal counts of its first term. */
export const OpenFromEvent: Story = {
  args: { url: eventUrl() },
  play: async ({ canvas }) => {
    const navigation = await canvas.findByRole(
      "navigation",
      { name: "Navigace organizace a akce" },
      { timeout: 5000 },
    )
    await userEvent.click(within(navigation).getByRole("link", { name: "Stravování" }))
    await showsHeading("Denní počty strávníků")({ canvas })
    await expect(within(navigation).getByRole("link", { name: "Stravování" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  },
}

/** Every day of the term, both ends included, by the categories somebody belongs to. */
export const DailyCounts: Story = {
  globals: { viewport: { value: "organizer1024", isRotated: false } },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole(
      "region",
      { name: "Tabulka stravování po dnech" },
      { timeout: 5000 },
    )
    const rows = within(table).getAllByRole("row")
    // The header and 14 days: 4. 7. (Sunday) to 17. 7. 2027.
    await expect(rows).toHaveLength(15)
    await expect(within(rows[1]!).getByText("ne 4. 7. 2027")).toBeVisible()
    await expect(within(rows[14]!).getByText("so 17. 7. 2027")).toBeVisible()
    // The header uses short marks, the legend above the table names the ones in use.
    for (const name of ["ZÁK", "VEG", "VGN", "VEG + BLK", "BLP", "Celkem osob"]) {
      await expect(within(table).getByRole("columnheader", { name })).toBeVisible()
    }
    const legend = within(canvas.getAllByRole("list", { name: "Legenda zkratek" })[0]!)
    for (const text of [
      "Základní strava",
      "Vegetariánská",
      "Veganská",
      "Bezlepková",
      "Bezlaktózová",
    ]) {
      await expect(legend.getByText(text, { exact: false })).toBeVisible()
    }
    // A combination stays on one line, so the table needs no sideways scrolling.
    await expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth)
    // A category nobody belongs to is not a column, nor in the legend.
    await expect(within(table).queryByRole("columnheader", { name: "BLK" })).not.toBeInTheDocument()
    // The categories add up to the day's total.
    const cells = within(rows[1]!)
      .getAllByRole("cell")
      .map((cell) => Number(cell.textContent))
      .slice(1)
    const total = cells.pop()
    await expect(cells.reduce((sum, count) => sum + count, 0)).toBe(total)
    await expect(total).toBe(MEAL_OVERVIEW.participants)
  },
}

/** The notes with the participant stay in the app; they are not read as diets. */
export const Notes: Story = {
  play: async ({ canvas }) => {
    const notes = await canvas.findByRole(
      "region",
      { name: "Poznámky ke stravě" },
      { timeout: 5000 },
    )
    // The button opens the registration on Potřeby, at the diet.
    const open = within(notes).getByRole("link", {
      name: "Zobrazit přihlášku: Eliška Svobodová",
    })
    await expect(open).toHaveAttribute("href", expect.stringContaining("tab=needs"))
    await expect(open).toHaveAttribute("href", expect.stringContaining("#strava"))
    const table = within(within(notes).getByRole("region", { name: "Tabulka poznámek ke stravě" }))
    await expect(table.getByText("Alergie na ořechy, stopy nevadí.")).toBeVisible()
    // Name, note and button share one vertical centre in each row.
    const row = table.getByRole("row", { name: /Eliška Svobodová/ })
    const centres = ["Eliška Svobodová", "Alergie na ořechy, stopy nevadí."].map((text) => {
      const rect = within(row).getByText(text).getBoundingClientRect()
      return rect.top + rect.height / 2
    })
    const button = within(row).getByRole("link").getBoundingClientRect()
    for (const centre of centres) {
      await expect(Math.abs(centre - (button.top + button.height / 2))).toBeLessThan(2)
    }
  },
}

/** The other term is chosen in the URL, and keeps its own counts. */
export const OtherTerm: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole("region", { name: "Tabulka stravování po dnech" }, { timeout: 5000 })
    await userEvent.click(canvas.getByRole("tab", { name: "Turnus 2" }))
    await showsText("V termínu zatím nejsou potvrzení účastníci")
    await expect(canvas.getByRole("link", { name: "Přejít na přihlášky" })).toBeVisible()
  },
}

/** The printout is a separate summary on the page, without names, notes or health data. */
export const PrintSummary: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole("region", { name: "Tabulka stravování po dnech" }, { timeout: 5000 })
    await expect(await canvas.findByRole("button", { name: "Vytisknout" })).toBeEnabled()
    const summary = canvas.getByLabelText("Souhrn stravování pro kuchyň", { selector: "article" })
    await expect(
      within(summary).getByRole("heading", { name: /Letní tábor Modrá Hora 2027/, hidden: true }),
    ).toBeInTheDocument()
    await expect(
      within(summary).getByText(/Turnus 1 · 4\. 7\. – 17\. 7\. 2027/),
    ).toBeInTheDocument()
    await expect(within(summary).getByText(/Vytvořeno/)).toBeInTheDocument()
    await expect(
      within(summary).getByRole("list", { name: "Legenda zkratek", hidden: true }),
    ).toBeInTheDocument()
    await expect(
      within(summary).getByRole("columnheader", { name: "VEG + BLK", hidden: true }),
    ).toBeInTheDocument()
    await expect(within(summary).queryByText(/Svobodová|ořechy/)).not.toBeInTheDocument()
    // Hidden on screen; only shown by the browser when printing.
    await expect(summary).not.toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", MEALS))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání stravování" }, { timeout: 5000 }),
    ).toBeVisible()
  },
}

/** A failed first load is not shown as empty and offers a retry. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", MEALS))
  },
  play: async ({ canvas }) => {
    await showsText("Stravování se nepodařilo načíst")
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
    await expect(
      canvas.queryByText("V termínu zatím nejsou potvrzení účastníci"),
    ).not.toBeInTheDocument()
  },
}

/** A failed refresh keeps the last counts and says so. */
export const RefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", MEALS, MEAL_OVERVIEW))
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("region", { name: "Tabulka stravování po dnech" }, { timeout: 5000 })
    await refresh(canvas)
    await showsText("Aktualizace se nezdařila")
    await waitFor(() =>
      expect(canvas.getByRole("region", { name: "Tabulka stravování po dnech" })).toBeVisible(),
    )
  },
}

/** A term of 45 days lists every day; the printout continues on further pages. */
export const LongTerm: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...mealHandlers.overview([MEAL_OVERVIEW_LONG]))
  },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole(
      "region",
      { name: "Tabulka stravování po dnech" },
      { timeout: 5000 },
    )
    await expect(within(table).getAllByRole("row")).toHaveLength(46)
    await expect(within(table).getByText("út 14. 9. 2027")).toBeVisible()
  },
}

/** On a phone the days are a compact list with the weekday, the total and the used categories. */
export const MobileDays: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole(
      "heading",
      { name: "Denní počty strávníků" },
      { timeout: 5000 },
    )
    const section = within(heading.closest("section")!)
    // One item per day of the term (the table is in the page, but hidden).
    const days = within(await section.findAllByRole("list").then((lists) => lists[0]!))
    await expect(days.getByText("ne 4. 7. 2027")).toBeVisible()
    await expect(days.getAllByText(/Celkem osob/)).toHaveLength(14)
    await expect(section.getAllByText("Vegetariánská + Bezlaktózová")[0]).toBeVisible()
    // The wide table is only for larger screens.
    await expect(section.queryByRole("region", { name: "Tabulka stravování po dnech" })).toBeNull()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
    // The notes stack too, so the button to the registration is in reach.
    const open = canvas.getByRole("link", { name: "Zobrazit přihlášku: Eliška Svobodová" })
    await expect(open).toBeVisible()
    await expect(open.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
  },
}
