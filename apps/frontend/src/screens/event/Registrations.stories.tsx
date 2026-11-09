import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Registrations",
  ...screenMeta,
  args: { url: eventUrl("/registrations") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

function textLeft(element: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect().left
}

/** Registrations of an event with filters (S2-11). */
export const Registrations: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Seznam přihlášek")(context)
    const { canvas } = context
    const paymentHeader = await canvas.findByRole("columnheader", { name: "Platba" })
    const paid = canvas.getByText("Zaplaceno", { exact: true })
    const noPayment = canvas.getByText("Bez povinnosti", { exact: true })
    await expect(Math.abs(textLeft(paid) - textLeft(paymentHeader))).toBeLessThanOrEqual(1)
    await expect(Math.abs(textLeft(noPayment) - textLeft(paymentHeader))).toBeLessThanOrEqual(1)
  },
}
