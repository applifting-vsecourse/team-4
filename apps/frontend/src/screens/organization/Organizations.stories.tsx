import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"

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

/**
 * The list could not be loaded: the app-wide error page. Known defect kept
 * visible: its <main> sits inside the workspace's <main>
 * (landmark-main-is-top-level), so a11y reports it instead of failing.
 */
export const LoadFailed: Story = {
  parameters: { a11y: { test: "todo" } },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", "/organizations"))
  },
  play: () => showsText("Stránku se nepodařilo načíst"),
}
