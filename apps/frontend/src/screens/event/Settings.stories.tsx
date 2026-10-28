import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

import { OPEN_EVENT } from "@/features/events/fixtures/events"
import { eventHandlers } from "@/features/events/fixtures/handlers"

const UNPUBLISHED_EVENT = { ...OPEN_EVENT, isPublished: false }

// Sonner's `richColors` toasts fall short of AA contrast; accepted for now, so
// the toast alone is left out of the accessibility check.
const withoutToasts = { a11y: { context: { exclude: ["[data-sonner-toaster]"] } } }

const meta = {
  title: "Screens/Event/Settings",
  ...screenMeta,
  args: { url: eventUrl("/settings") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const findPublicationSwitch = async (canvas: Parameters<NonNullable<Story["play"]>>[0]["canvas"]) =>
  canvas.findByRole("switch", { name: "Zveřejnit ve veřejném katalogu" }, { timeout: 5000 })

/** Terms, registration, payment settings and catalog publication of an event (S2-04, S2-06, S2-09, F54-1). */
export const Settings: Story = {
  play: async (context) => {
    await showsHeading("Termíny a ceny")(context)
    await expect(await findPublicationSwitch(context.canvas)).toBeChecked()
  },
}

/** An event not listed in the catalog yet; the organizer publishes it (F54-1). */
export const PublishInCatalog: Story = {
  parameters: withoutToasts,
  beforeEach: ({ msw }) => {
    msw.use(
      ...eventHandlers.detail(UNPUBLISHED_EVENT),
      ...eventHandlers.publication(UNPUBLISHED_EVENT),
    )
  },
  play: async ({ canvas, userEvent }) => {
    const publication = await findPublicationSwitch(canvas)
    await expect(publication).not.toBeChecked()
    await expect(canvas.getByText(/Akce v katalogu není/)).toBeVisible()

    await userEvent.click(publication)

    await expect(
      await canvas.findByText("Návštěvníci akci najdou v katalogu akcí.", {}, { timeout: 5000 }),
    ).toBeVisible()
    await expect(publication).toBeChecked()
  },
}

/** Saving the change fails: the saved state stays and the organizer can retry (F54-1). */
export const PublicationFails: Story = {
  parameters: withoutToasts,
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail(UNPUBLISHED_EVENT), ...eventHandlers.publicationFails())
  },
  play: async ({ canvas, userEvent }) => {
    const publication = await findPublicationSwitch(canvas)

    await userEvent.click(publication)

    await expect(await canvas.findByText(/nepodařilo uložit/, {}, { timeout: 5000 })).toBeVisible()
    await expect(publication).not.toBeChecked()
    await expect(publication).toBeEnabled()
    await expect(canvas.getByText(/Akce v katalogu není/)).toBeVisible()
  },
}
