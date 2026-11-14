import type { Meta, StoryObj } from "@storybook/react-vite"
import { userEvent } from "storybook/test"

import { failOn } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { DRAFT_EVENT } from "@/features/events/fixtures/events"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const EVENT = "/organizations/:organizationId/events/:eventId"

const meta = {
  title: "Screens/Event/Edit",
  ...screenMeta,
  args: { url: `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/edit` },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Name, place and description of a draft event (S2-04). */
export const Edit: Story = { play: showsHeading("Upravit akci") }

/** Open registration locks the event: the reason instead of a form. */
export const Locked: Story = {
  args: { url: eventUrl("/edit") },
  play: () =>
    showsText("Od otevření přihlašování jsou název, popis, místo, termíny a ceny zamčené"),
}

export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    await userEvent.clear(await canvas.findByLabelText("Název akce"))
    await userEvent.click(canvas.getByRole("button", { name: "Uložit změny" }))
    await showsText("Vyplňte název akce.")
  },
}

export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", EVENT))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Uložit změny" }))
    await showsText("Změny se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

/** Registration opened meanwhile: the server refuses and says why. */
export const LockedMeanwhile: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("put", EVENT, 409, {
        code: "event_locked",
        message: "Akce je od otevření přihlašování zamčená.",
      }),
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Uložit změny" }))
    await showsText("Akce je od otevření přihlašování zamčená.")
  },
}
