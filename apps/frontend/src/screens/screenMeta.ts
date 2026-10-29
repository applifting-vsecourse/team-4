import type { Meta, StoryContext } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { ScreenPreview } from "@/screens/ScreenPreview"

import { authHandlers } from "@/features/auth/fixtures/handlers"
import { OPEN_EVENT } from "@/features/events/fixtures/events"
import { eventHandlers } from "@/features/events/fixtures/handlers"
import { organizationHandlers } from "@/features/organizations/fixtures/handlers"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { roomHandlers } from "@/features/rooms/fixtures/handlers"

/** Shared by every screen story: the app's own router, full page, desktop. */
export const screenMeta = {
  component: ScreenPreview,
  parameters: {
    // The app's own router replaces the global one-route decorator.
    appRouter: true,
    layout: "fullscreen",
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Partial<Meta<typeof ScreenPreview>>

/** Everything an organizer's screens read, for the signed-in organizer. */
export const organizerBackend = () => [
  ...authHandlers.signedIn(),
  ...organizationHandlers.list(),
  ...eventHandlers.list(),
  ...roomHandlers.overview(),
  ...registrationHandlers.event(),
]

/** URL of a page of the open summer camp. */
export const eventUrl = (page = "") =>
  `/organizations/${ORGANIZATION.id}/events/${OPEN_EVENT.id}${page}`

/** Play check: the screen loaded with its fixture data, not a spinner or an error. */
export const showsHeading =
  (name: string) =>
  async ({ canvas }: Pick<StoryContext, "canvas">) => {
    await expect(await canvas.findByRole("heading", { name }, { timeout: 5000 })).toBeVisible()
  }
