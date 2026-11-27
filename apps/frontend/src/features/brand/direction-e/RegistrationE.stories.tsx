import type { Meta, StoryObj } from "@storybook/react-vite"

import { RegistrationE } from "@/features/brand/direction-e/RegistrationE"
import { withDirection } from "@/features/brand/withDirection"

const meta = {
  title: "Brand/Směr E/Přihláška",
  component: RegistrationE,
  decorators: [withDirection("e")],
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof RegistrationE>

export default meta

type Story = StoryObj<typeof meta>

/** Desktop, step 2: terms are done and collapse into one line with „Změnit“. */
export const Desktop: Story = { args: { step: 2 } }

/** Phone at 360 px, step 2: the step rail becomes „Krok 2 ze 4“ with a progress bar. */
export const Mobil: Story = {
  args: { step: 2 },
  globals: { viewport: { value: "mobile", isRotated: false } },
}

/** Step 1 on a phone: terms with price and capacity. */
export const Krok1: Story = {
  name: "Krok 1 – termíny (mobil)",
  args: { step: 1 },
  globals: { viewport: { value: "mobile", isRotated: false } },
}

/** Step 4: everything filled in, price and conditions before sending. */
export const Krok4: Story = {
  name: "Krok 4 – souhrn",
  args: { step: 4 },
}
