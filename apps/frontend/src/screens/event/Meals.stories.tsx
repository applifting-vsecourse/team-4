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
    await showsHeading("Strávníci po dnech")({ canvas })
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
    // The header and 14 days: 4. 7. to 17. 7. 2027.
    await expect(rows).toHaveLength(15)
    await expect(within(rows[1]!).getByText("4. 7. 2027")).toBeVisible()
    await expect(within(rows[14]!).getByText("17. 7. 2027")).toBeVisible()
    for (const name of [
      "Základní strava",
      "Vegetariánská",
      "Veganská",
      "Vegetariánská + Bezlaktózová",
      "Bezlepková",
      "Celkem",
    ]) {
      await expect(within(table).getByRole("columnheader", { name })).toBeVisible()
    }
    // Long category names wrap, so the table needs no sideways scrolling.
    await expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth)
    // A category nobody belongs to is not a column.
    await expect(
      within(table).queryByRole("columnheader", { name: "Bezlaktózová" }),
    ).not.toBeInTheDocument()
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
    await expect(within(notes).getByRole("link", { name: "Eliška Svobodová" })).toBeVisible()
    await expect(within(notes).getByText("Alergie na ořechy, stopy nevadí.")).toBeVisible()
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
    await expect(within(table).getByText("14. 9. 2027")).toBeVisible()
  },
}
