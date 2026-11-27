import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationsB } from "@/features/brand/direction-b/RegistrationsB"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr B/Seznam přihlášek",
  component: RegistrationsB,
  decorators: [withDirection("b")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationsB>

export default meta

type Story = StoryObj<typeof meta>

/** Registrations with long names, more terms and every participation and payment state. */
export const Výchozí: Story = { args: { state: "ready" } }

/** The narrowest organizer screen, 1024 px. */
export const Šířka1024: Story = {
  name: "1024 px",
  args: { state: "ready" },
  globals: { viewport: { value: "organizer1024", isRotated: false } },
}

/** First load: counts and filters stay, the table shows skeleton rows. */
export const Načítání: Story = { args: { state: "loading" } }

/** Filters match nothing. */
export const PrázdnéVýsledky: Story = { name: "Prázdné výsledky", args: { state: "no-results" } }

/** An event without any registration yet. */
export const BezPřihlášek: Story = { name: "Bez přihlášek", args: { state: "empty" } }
