import type { Meta, StoryObj } from "@storybook/react-vite"

import { ROUTES } from "@/app/routes"
import { DARK, prototypeMeta } from "@/prototype/prototypeStories"

// The dev-only /design-system page (DESIGN.md), in both themes. Not run as a
// test yet: besides the known contrast issues, its showcase has two a11y
// violations of its own (open the Accessibility panel): the skeleton example
// puts aria-label on a role-less div (DataDisplaySection), and the
// EventCombobox trigger is a combobox without an accessible name
// (OverlaysNavigationSection). Drop `!test` once they are fixed.
const meta = {
  ...prototypeMeta,
  title: "Pages/Dev/Design system",
  tags: ["!test"],
  args: { ...prototypeMeta.args, route: ROUTES.designSystem },
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

export const Light: Story = {}

export const Dark: Story = { globals: DARK }
