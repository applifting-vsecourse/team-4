import type { Meta, StoryObj } from "@storybook/react-vite"

import { LandingRedesign } from "@/poc/landing/LandingRedesign"

import "./directions.css"

const meta = {
  title: "POC/Landing redesign",
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** A · Ticket stub: warm paper, ink outlines, small hard shadows, Bricolage Grotesque. */
export const A_TicketStub: Story = {
  render: () => (
    <div data-direction="stub">
      <LandingRedesign />
    </div>
  ),
}

/** C · Soft tonal: mint surfaces, 20px radius, pill controls, Fraunces headings. */
export const C_SoftTonal: Story = {
  render: () => (
    <div data-direction="soft">
      <LandingRedesign />
    </div>
  ),
}
