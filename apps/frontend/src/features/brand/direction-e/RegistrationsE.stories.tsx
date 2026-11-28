import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationsE } from "@/features/brand/direction-e/RegistrationsE"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr E/Seznam přihlášek",
  component: RegistrationsE,
  decorators: [withDirection("e")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationsE>

export default meta

type Story = StoryObj<typeof meta>

/** Registrations grouped by term, with long names and every participation and payment state. */
export const Výchozí: Story = { args: { state: "ready" } }

/** The narrowest organizer screen, 1024 px. */
export const Šířka1024: Story = {
  name: "1024 px",
  args: { state: "ready" },
  globals: { viewport: { value: "organizer1024", isRotated: false } },
}

/** First load: filters stay, the table shows group and row skeletons. */
export const Načítání: Story = { args: { state: "loading" } }

/** Filters match nothing. */
export const PrázdnéVýsledky: Story = { name: "Prázdné výsledky", args: { state: "no-results" } }

/** An event without any registration yet. */
export const BezPřihlášek: Story = { name: "Bez přihlášek", args: { state: "empty" } }
