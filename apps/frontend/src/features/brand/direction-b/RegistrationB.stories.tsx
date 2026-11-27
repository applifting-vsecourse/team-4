import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationB } from "@/features/brand/direction-b/RegistrationB"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr B/Přihláška",
  component: RegistrationB,
  decorators: [withDirection("b")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationB>

export default meta

type Story = StoryObj<typeof meta>

/** Desktop: one column of numbered sections, the price and submit in a sticky bottom bar. */
export const Desktop: Story = {}

/** Phone at 360 px: term cards stack, the bottom bar stays in reach of the thumb. */
export const Mobil: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
}
