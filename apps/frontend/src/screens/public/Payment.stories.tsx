import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { makeQrPaymentPage, QR_TOKEN } from "@/features/registrations/fixtures/publicRegistration"

const PAYMENT = `/public/payments/:token`

const meta = {
  title: "Screens/Public/Payment",
  ...screenMeta,
  args: { url: `/platba/${QR_TOKEN}` },
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.qrPayment())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Types `amount` (Kč) into the form, or keeps the full debt, and pays. */
async function pay({ canvas }: Pick<StoryContext, "canvas">, amount?: string) {
  const field = await canvas.findByLabelText("Částka (Kč)", {}, { timeout: 5000 })
  if (amount !== undefined) {
    await userEvent.clear(field)
    await userEvent.type(field, amount)
  }
  await userEvent.click(canvas.getByRole("button", { name: "Zaplatit" }))
}

/** The page opened from the QR: the remaining debt, prefilled (F21-1). */
export const Payment: Story = {
  play: async ({ canvas }) => {
    await showsText("Platba přihlášky")
    await expect(await canvas.findByLabelText("Částka (Kč)")).toHaveValue("2500")
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PAYMENT))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání platby" })).toBeVisible()
  },
}

/** An unknown or expired token opens nothing. */
export const InvalidLink: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PAYMENT, 404))
  },
  play: () => showsText("Záznam není dostupný"),
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PAYMENT))
  },
  play: () => showsText("Částku k úhradě se nepodařilo načíst. Zkuste to prosím znovu."),
}

export const AmountTooHigh: Story = {
  play: async (context) => {
    await pay(context, "3000")
    await showsText(/Částka je vyšší než zbývá zaplatit/)
  },
}

export const Saving: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", PAYMENT))
  },
  play: async (context) => {
    await pay(context)
    await expect(await context.canvas.findByRole("button", { name: /Zaplatit/ })).toBeDisabled()
  },
}

export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", PAYMENT))
  },
  play: async (context) => {
    await pay(context)
    await showsText("Platbu se nepodařilo dokončit. Zkuste to prosím znovu.")
  },
}

/** The organizer recorded a payment meanwhile: nothing saved, the form asks again. */
export const DebtReduced: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", PAYMENT, 409, { code: "debt_reduced" }))
  },
  play: async (context) => {
    await pay(context)
    await showsText("Částka k úhradě se mezitím snížila")
  },
}

export const PaidPart: Story = {
  play: async (context) => {
    await pay(context, "1000")
    await showsText("Platba byla přijata")
    await expect(context.canvas.getByRole("button", { name: "Zaplatit další část" })).toBeVisible()
  },
}

export const PaidInFull: Story = {
  play: async (context) => {
    await pay(context)
    await showsText("Platba byla přijata")
    await expect(
      context.canvas.queryByRole("button", { name: "Zaplatit další část" }),
    ).not.toBeInTheDocument()
  },
}

/** Nothing is owed: the link says so instead of offering a payment. */
export const NothingToPay: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.qrPayment(makeQrPaymentPage({ balanceMinor: 0 })))
  },
  play: () => showsText("Přihláška je uhrazená"),
}
