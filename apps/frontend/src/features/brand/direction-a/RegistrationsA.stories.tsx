import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { RegistrationsA } from "@/features/brand/direction-a/RegistrationsA"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr A/Seznam přihlášek",
  component: RegistrationsA,
  decorators: [withDirection("a")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationsA>

export default meta

type Story = StoryObj<typeof meta>

/** Registrations with long names, more terms and every participation and payment state. */
export const Výchozí: Story = { args: { state: "ready" } }

/** After picking a payment filter: the rows narrow, the count and a removable chip say why. */
export const Filtrováno: Story = {
  args: { state: "ready", initialFilter: { payment: "unpaid" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Platba: Nezaplaceno")).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Eliška Svobodová" })).toBeVisible()
    await expect(canvas.queryByRole("link", { name: "Anna Nováková" })).toBeNull()
  },
}

/** The narrowest organizer screen, 1024 px. */
export const Šířka1024: Story = {
  name: "1024 px",
  args: { state: "ready" },
  globals: { viewport: { value: "organizer1024", isRotated: false } },
}

/** First load: the toolbar stays, the table shows skeleton rows. */
export const Načítání: Story = { args: { state: "loading" } }

/** A search matches nothing; "Zrušit filtry" brings the rows back. */
export const PrázdnéVýsledky: Story = {
  name: "Prázdné výsledky",
  args: { state: "no-results" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Žádná přihláška neodpovídá filtrům")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Zrušit filtr Hledání: „Zuzana“" }))
    await expect(canvas.getByRole("link", { name: "Anna Nováková" })).toBeVisible()
    // Back to the empty result, the state this story shows.
    await userEvent.type(canvas.getByRole("searchbox"), "Zuzana")
  },
}

/** An event without any registration yet. */
export const BezPřihlášek: Story = { name: "Bez přihlášek", args: { state: "empty" } }
