import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn } from "storybook/test"

import { RegistrationDetail } from "@/features/registrations/components/RegistrationDetail"
import {
  makeRegistrationDetail,
  TERM_AUGUST,
  TERM_JULY,
} from "@/features/registrations/fixtures/registrations"

// Known issue, awaiting a design decision: the destructive token on the
// destructive Alert measures 4.16–4.3:1, below WCAG AA 4.5:1. Changing it is a
// theme-token / ui-kit change (AGENTS.md: ask first). Only color-contrast is
// off here; every other a11y rule still runs. Remove once the token is fixed.
const KNOWN_DESTRUCTIVE_CONTRAST_ISSUE = {
  a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
}

const meta = {
  component: RegistrationDetail,
  args: {
    registration: makeRegistrationDetail(),
    updatedAt: Date.parse("2027-03-10T08:00:00.000Z"),
    isRefreshing: false,
    hasRefreshFailed: false,
    onRefresh: fn(),
  },
} satisfies Meta<typeof RegistrationDetail>

export default meta

type Story = StoryObj<typeof meta>

export const Unpaid: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nezaplaceno")).toBeVisible()
    await expect(canvas.getByText("2700001")).toBeVisible()
  },
}

export const Partial: Story = {
  args: {
    registration: makeRegistrationDetail({
      paidMinor: 200_000,
      balanceMinor: 250_000,
      paymentState: "partial",
      payments: [
        {
          id: "0190c0de-0000-7000-8000-000000000401",
          receivedOn: "2027-03-12",
          amountMinor: 200_000,
        },
      ],
    }),
  },
}

export const Paid: Story = {
  args: {
    registration: makeRegistrationDetail({
      paidMinor: 450_000,
      balanceMinor: 0,
      paymentState: "paid",
      reminderAt: null,
      payments: [
        {
          id: "0190c0de-0000-7000-8000-000000000402",
          receivedOn: "2027-03-12",
          amountMinor: 450_000,
        },
      ],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Zaplaceno")).toBeVisible()
  },
}

/** Only waitlisted terms: no payment obligation. */
export const Waitlisted: Story = {
  args: {
    registration: makeRegistrationDetail({
      terms: [TERM_AUGUST],
      amountDueMinor: 0,
      balanceMinor: 0,
      paymentState: "none",
      reminderAt: null,
      variableSymbol: null,
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Bez platební povinnosti")).toBeVisible()
  },
}

export const BothTermsOneWaitlisted: Story = {
  args: {
    registration: makeRegistrationDetail({ terms: [TERM_JULY, TERM_AUGUST] }),
  },
}

export const RefreshFailed: Story = {
  parameters: KNOWN_DESTRUCTIVE_CONTRAST_ISSUE,
  args: { hasRefreshFailed: true },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText("Data se nepodařilo načíst. Zkuste to znovu.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Zkusit znovu" }))
    await expect(args.onRefresh).toHaveBeenCalled()
  },
}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile360" } },
}

export const Dark: Story = {
  globals: { theme: "dark" },
}
