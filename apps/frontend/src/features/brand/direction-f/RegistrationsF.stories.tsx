import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationsF } from "@/features/brand/direction-f/RegistrationsF"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr F/Seznam přihlášek",
  component: RegistrationsF,
  decorators: [withDirection("f")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationsF>

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

/** First load: the board and filters stay, banded skeleton rows below. */
export const Načítání: Story = { args: { state: "loading" } }

/** Filters match nothing. */
export const PrázdnéVýsledky: Story = { name: "Prázdné výsledky", args: { state: "no-results" } }

/** An event without any registration yet. */
export const BezPřihlášek: Story = { name: "Bez přihlášek", args: { state: "empty" } }
