import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationF } from "@/features/brand/direction-f/RegistrationF"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr F/Přihláška",
  component: RegistrationF,
  decorators: [withDirection("f")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationF>

export default meta

type Story = StoryObj<typeof meta>

/** Desktop: the sign band with pictograms, terms as a timetable, price on a navy plate. */
export const Desktop: Story = {}

/** Phone at 360 px: facts stack under the title, timetable columns become lines. */
export const Mobil: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
}
