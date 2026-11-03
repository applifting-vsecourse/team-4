import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Public/Landing",
  ...screenMeta,
  args: { url: "/" },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Landing page in the S3-T2 "Ticket stub" style, with both audiences and their ways in (F58). */
export const Landing: StoryObj<typeof meta> = { play: showsHeading("Akce bez chaosu") }
