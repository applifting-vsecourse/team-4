import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import { DESKTOP, knownIssues, MOBILE, prototypeMeta, urls } from "@/prototype/prototypeStories"

// The whole of akc.io, clickable, on an in-memory backend: sign in, create,
// register, pay. Use the controls panel to pick who is signed in, slow the
// network down or take the server offline; the floating "Prototype" panel is
// the address bar, the jump menu and the mailbox for magic links.
const meta = {
  ...prototypeMeta,
  title: "Prototype/Clickable app",
  args: { ...prototypeMeta.args, hasToolbar: true, latency: 250 },
  globals: DESKTOP,
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** The demo world, signed out, on the landing page. Demo passwords are in the panel. */
export const DemoData: Story = {}

/** Nothing exists yet: sign up and build an event from scratch. */
export const EmptyWorld: Story = {
  args: { scenario: "blank" },
}

/** Jana is signed in as an organizer and Anna as a participant, in one browser. */
export const BothSignedIn: Story = {
  args: { organizer: "jana", participant: "anna", route: urls.organization(DEMO.rosa.id) },
}

export const OnAPhone: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  globals: MOBILE,
}

/** Every answer takes 2 s: the loading states of every page. Not run as a test. */
export const SlowNetwork: Story = {
  tags: ["!test"],
  args: { organizer: "jana", route: ROUTES.organizations, latency: 2000 },
}

/** Every request fails with 500: what each page shows when the server is down. */
export const ServerDown: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp), isServerDown: true },
  parameters: knownIssues("destructiveAlertContrast"),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Akci se nepodařilo načíst")).toBeVisible()
  },
}
