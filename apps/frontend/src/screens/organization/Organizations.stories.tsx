import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect } from "storybook/test"

import { apiUrl, failOn } from "@/screens/msw"
import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

const meta = {
  title: "Screens/Organization/Organizations",
  ...screenMeta,
  args: { url: "/organizations" },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Choosing one of several organizations (S2-03). With one, the list is skipped. */
export const Organizations: Story = { play: showsHeading("Vyberte organizaci") }

/** A new organizer: the way to the first organization. */
export const NoOrganizations: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(apiUrl("/organizations"), () => HttpResponse.json([])))
  },
  play: () => showsText("Zatím nemáte organizaci"),
}

/** The list could not be loaded: the app-wide error page inside the workspace's one <main>. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", "/organizations"))
  },
  play: async ({ canvasElement }) => {
    await showsText("Stránku se nepodařilo načíst")
    await expect(canvasElement.querySelectorAll("main")).toHaveLength(1)
  },
}
