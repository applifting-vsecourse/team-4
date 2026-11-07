import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Public/Audience pages",
  ...screenMeta,
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

// Both pages are static: no request handlers, so they render without the API (F58/F59).
const linksTo =
  (links: Record<string, string>) =>
  async ({ canvasElement }: Pick<StoryContext, "canvasElement">) => {
    const main = within(within(canvasElement).getByRole("main"))
    for (const [name, href] of Object.entries(links)) {
      await expect(main.getByRole("link", { name })).toHaveAttribute("href", href)
    }
  }

/** For organizers: benefits, a sample with made-up data, sign-up and sign-in. */
export const ForOrganizers: Story = {
  args: { url: "/for-organizers" },
  play: async (context) => {
    await showsHeading("Pro organizátory")(context)
    await expect(context.canvas.getByText("Návrh: přijmout")).toBeVisible()
    await expect(context.canvas.getByText("Simulace")).toBeVisible()
    await linksTo({
      "Založit účet": "/signup",
      "Přihlásit se": "/login",
      Úvod: "/",
      "Pro účastníky": "/for-participants",
    })(context)
  },
}

/** For participants: benefits, a sample with made-up data, catalog and my registrations. */
export const ForParticipants: Story = {
  args: { url: "/for-participants" },
  play: async (context) => {
    await showsHeading("Pro účastníky")(context)
    await expect(context.canvas.getByText("Simulovaná platba")).toBeVisible()
    await linksTo({
      "Hledat v katalogu": "/events",
      "Moje přihlášky": "/my-registrations",
      Úvod: "/",
      "Pro organizátory": "/for-organizers",
    })(context)
  },
}
