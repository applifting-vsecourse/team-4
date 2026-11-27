import type { Meta, StoryObj } from "@storybook/react-vite"

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

/** The narrowest organizer screen, 1024 px. */
export const Šířka1024: Story = {
  name: "1024 px",
  args: { state: "ready" },
  globals: { viewport: { value: "organizer1024", isRotated: false } },
}

/** First load: the toolbar stays, the table shows skeleton rows. */
export const Načítání: Story = { args: { state: "loading" } }

/** Filters match nothing. */
export const PrázdnéVýsledky: Story = { name: "Prázdné výsledky", args: { state: "no-results" } }

/** An event without any registration yet. */
export const BezPřihlášek: Story = { name: "Bez přihlášek", args: { state: "empty" } }
