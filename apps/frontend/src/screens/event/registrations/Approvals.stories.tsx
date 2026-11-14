import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta } from "@/screens/screenMeta"
import { refresh, showsText } from "@/screens/steps"

import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { makeOwnChange } from "@/features/registrations/fixtures/registrationChanges"

const CHANGES = "/organizations/:organizationId/events/:eventId/change-requests"
const PENDING = [
  makeOwnChange(),
  makeOwnChange({
    id: "0190c0de-0000-7000-8000-000000000702",
    kinds: ["data"],
    participant: { firstName: "Petr", lastName: "Dvořák", email: "petr@example.cz" },
  }),
]

const meta = {
  title: "Screens/Event/Registrations/Approvals",
  ...screenMeta,
  args: { url: eventUrl("/registrations?view=approvals") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
    // Prepended after the backend, so it wins over its empty request list.
    msw.use(...registrationHandlers.eventChangeRequests(PENDING))
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Přihlášky → Žádosti: requests waiting for the organizer, oldest first (F35-2a). */
export const Queue: Story = {
  play: async () => {
    await showsText("Jana Nováková")
    await showsText("Přesun termínu")
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", CHANGES))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání žádostí" })).toBeVisible()
  },
}

export const EmptyQueue: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.eventChangeRequests([]))
  },
  play: () => showsText("Žádné změny nečekají na schválení."),
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", CHANGES))
  },
  play: () => showsText("Data se nepodařilo načíst"),
}

export const RefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", CHANGES, { changes: PENDING }))
  },
  play: async ({ canvas }) => {
    await showsText("Jana Nováková")
    await refresh(canvas)
    await showsText("Data se nepodařilo načíst")
  },
}
