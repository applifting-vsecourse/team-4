import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Public/Catalog",
  ...screenMeta,
  args: { url: "/events" },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Placeholder of the public catalog until F54-2a (#170) delivers the list. */
export const Catalog: StoryObj<typeof meta> = { play: showsHeading("Katalog akcí") }
