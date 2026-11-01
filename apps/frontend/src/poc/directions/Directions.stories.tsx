import { useLayoutEffect } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { LandingRedesign } from "@/poc/landing/LandingRedesign"
import { LandingWeb } from "@/poc/landing/LandingWeb"

import "./directions.css"
import "@/poc/landing/web.css"

type Direction = "stub" | "soft" | "web"

// The direction is set on <html> so the portal-rendered mobile menu is themed as well.
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

  return direction === "web" ? <LandingWeb /> : <LandingRedesign />
}

const meta = {
  title: "POC/Landing redesign",
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const mobile = {
  parameters: {
    viewport: {
      options: { mobile: { name: "Mobile", styles: { width: "360px", height: "740px" } } },
    },
  },
  globals: { viewport: { value: "mobile", isRotated: false } },
} satisfies Story

/** A · Ticket stub: warm paper, ink outlines, small hard shadows, Bricolage Grotesque. */
export const A_TicketStub: Story = { render: () => <Preview direction="stub" /> }

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

/** C · Soft tonal: mint surfaces, 20px radius, pill controls, Fraunces headings. */
export const C_SoftTonal: Story = { render: () => <Preview direction="soft" /> }

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

/** D · Homepage: a 2000s personal web page. Flat panels with label strips, visible links, dotted paper. */
export const D_Homepage: Story = { render: () => <Preview direction="web" /> }

/** D · Homepage on a 360 px phone. */
export const D_HomepageMobile: Story = {
  ...mobile,
  render: () => (
    <Preview
      direction="web"
      isMobile
    />
  ),
}
