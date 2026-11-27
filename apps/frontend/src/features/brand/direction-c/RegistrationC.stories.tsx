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

/** Desktop: the event as a sticky poster next to the form as a numbered document. */
export const Desktop: Story = {}

/** Phone at 360 px: the poster shrinks to a header block above the form. */
export const Mobil: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
}
