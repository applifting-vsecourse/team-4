import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationA } from "@/features/brand/direction-a/RegistrationA"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr A/Přihláška",
  component: RegistrationA,
  decorators: [withDirection("a")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationA>

export default meta

type Story = StoryObj<typeof meta>

/** Desktop: form with a sticky summary of the picked terms and price. */
export const Desktop: Story = {}

/** Phone at 360 px: the summary comes first, the submit button ends the form. */
export const Mobil: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
}
