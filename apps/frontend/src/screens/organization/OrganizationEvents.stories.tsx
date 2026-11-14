import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"

import { apiUrl, failOn } from "@/screens/msw"
import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const EVENTS = "/organizations/:organizationId/events"

const meta = {
  title: "Screens/Organization/OrganizationEvents",
  ...screenMeta,
  args: { url: `/organizations/${ORGANIZATION.id}` },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** "Akce a turnusy": the events of one organization (S2-04). */
export const OrganizationEvents: Story = { play: showsHeading("Akce a turnusy") }

/** No event yet: the way to the first one. */
export const NoEvents: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(apiUrl(EVENTS), () => HttpResponse.json([])))
  },
  play: () => showsText("Zatím žádné akce"),
}

/** Another organizer's or a removed organization. */
export const OrganizationUnavailable: Story = {
  args: { url: "/organizations/0190c0de-0000-7000-8000-000000000299" },
  play: () => showsText("Záznam není dostupný"),
}

/** A server failure reads the same as an unavailable organization (as the app renders it). */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", EVENTS))
  },
  play: () => showsText("Záznam není dostupný"),
}
