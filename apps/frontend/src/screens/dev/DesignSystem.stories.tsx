import type { Meta, StoryObj } from "@storybook/react-vite"
import { toast } from "sonner"
import { expect, screen, userEvent, waitFor } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { authHandlers } from "@/features/auth/fixtures/handlers"

const meta = {
  title: "Screens/Dev/Design system",
  ...screenMeta,
  args: { url: "/design-system" },
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** The kit, the shared components and tokens in one page; development builds only (#79). */
export const DesignSystem: Story = {
  play: showsHeading("akc.io design system"),
}

const TOASTS = [
  ["Toast", "Platba zaznamenána"],
  ["Chybový toast", "Platbu se nepodařilo uložit"],
  ["Varovný toast", "Termín je skoro plný"],
  ["Informační toast", "Návrh se přepočítává"],
] as const

/**
 * A toast of every tone stays open, so the accessibility check measures their
 * contrast (WCAG AA) after the play function.
 */
const showsEveryToast: Story["play"] = async (context) => {
  await showsHeading("akc.io design system")(context)
  toast.dismiss()
  for (const [button, message] of TOASTS) {
    await userEvent.click(context.canvas.getByRole("button", { name: button }))
    await waitFor(() => expect(screen.getByText(message)).toBeVisible())
  }
}

/** The check measures the toasts only; the page itself is the story above. */
const TOASTS_ONLY = { a11y: { test: "error", context: { include: ["[data-sonner-toaster]"] } } }

export const Toasts: Story = {
  parameters: TOASTS_ONLY,
  play: showsEveryToast,
}

export const ToastsDark: Story = {
  globals: { theme: "dark" },
  parameters: TOASTS_ONLY,
  play: showsEveryToast,
}
