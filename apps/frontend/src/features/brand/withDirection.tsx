import { useLayoutEffect, type ReactNode } from "react"
import type { Decorator } from "@storybook/react-vite"

import "@/features/brand/directions.css"

export type Direction = "a" | "b" | "c"

// Puts the direction on <html> so dialogs, selects and menus rendered in portals take it too.
function DirectionScope({ direction, children }: { direction: Direction; children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add("brand-direction", `brand-${direction}`)
    return () => root.classList.remove("brand-direction", `brand-${direction}`)
  }, [direction])
  return children
}

/** Storybook decorator of a brand direction (S5-T03-1, POC). */
export function withDirection(direction: Direction): Decorator {
  return function WithDirection(Story) {
    return (
      <DirectionScope direction={direction}>
        <Story />
      </DirectionScope>
    )
  }
}
