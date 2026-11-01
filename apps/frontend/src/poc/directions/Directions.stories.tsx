import { useLayoutEffect } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { LandingRedesign } from "@/poc/landing/LandingRedesign"

import "./directions.css"

type Direction = "stub" | "soft"

// The direction is set on <html> too, so the portal-rendered mobile menu is themed as well.
function Preview({ direction, isMobile = false }: { direction: Direction; isMobile?: boolean }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.direction = direction
    if (isMobile) root.dataset.scrollbars = "hidden"
    return () => {
      delete root.dataset.direction
      delete root.dataset.scrollbars
    }
  }, [direction, isMobile])

  return <LandingRedesign />
}

const meta = {
  title: "POC/Landing redesign",
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** A · Ticket stub: warm paper, ink outlines, small hard shadows, Bricolage Grotesque. */
export const A_TicketStub: Story = { render: () => <Preview direction="stub" /> }

/** C · Soft tonal: mint surfaces, 20px radius, pill controls, Fraunces headings. */
export const C_SoftTonal: Story = { render: () => <Preview direction="soft" /> }

const mobile = {
  parameters: {
    viewport: {
      options: { mobile: { name: "Mobile", styles: { width: "360px", height: "740px" } } },
    },
  },
  globals: { viewport: { value: "mobile", isRotated: false } },
} satisfies Story

/** A · Ticket stub on a 360 px phone. */
export const A_TicketStubMobile: Story = {
  ...mobile,
  render: () => (
    <Preview
      direction="stub"
      isMobile
    />
  ),
}

/** C · Soft tonal on a 360 px phone. */
export const C_SoftTonalMobile: Story = {
  ...mobile,
  render: () => (
    <Preview
      direction="soft"
      isMobile
    />
  ),
}
