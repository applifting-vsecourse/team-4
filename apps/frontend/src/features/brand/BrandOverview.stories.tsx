import type { Meta, StoryObj } from "@storybook/react-vite"

import { BrandOverview } from "@/features/brand/BrandOverview"

const meta = {
  title: "Brand/Přehled směrů",
  component: BrandOverview,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof BrandOverview>

export default meta

/** References, problems of the current screens and the summary of directions A/B/C. */
export const Přehled: StoryObj<typeof meta> = {}
