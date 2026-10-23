import type { Meta, StoryObj } from "@storybook/react-vite"

import { BrandMark } from "@/components/BrandMark"

const meta = {
  component: BrandMark,
} satisfies Meta<typeof BrandMark>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Large: Story = {
  args: { isLarge: true },
}
