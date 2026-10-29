import type { Meta, StoryObj } from "@storybook/react-vite"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Public/Landing",
  ...screenMeta,
  args: { url: "/" },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Landing page with the way in for organizers and participants (S2-01). */
export const Landing: StoryObj<typeof meta> = {
  play: showsHeading("Přihlášky, ubytování a platby pro vaše akce na jednom místě"),
}
