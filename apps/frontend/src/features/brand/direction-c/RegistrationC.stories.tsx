import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationC } from "@/features/brand/direction-c/RegistrationC"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr C/Přihláška",
  component: RegistrationC,
  decorators: [withDirection("c")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationC>

export default meta

type Story = StoryObj<typeof meta>

/** Desktop: one column, a compact poster band of the event above the form as a numbered document. */
export const Desktop: Story = {}

/** Phone at 360 px: the same column; the facts of the poster fold into two columns. */
export const Mobil: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
}
