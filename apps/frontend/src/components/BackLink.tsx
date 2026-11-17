import { forwardRef, type AnchorHTMLAttributes } from "react"
import { createLink } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

/** `className` is layout only, e.g. a bottom margin. */
const BackAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function BackAnchor({ children, className, ...anchor }, ref) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={className}
        asChild
      >
        <a
          ref={ref}
          {...anchor}
        >
          <ArrowLeft aria-hidden />
          {children}
        </a>
      </Button>
    )
  },
)

// The way back to the parent page, above the page heading. Built with
// `createLink`, so `to` and `params` are checked against the route tree like a
// plain `Link`.
export const BackLink = createLink(BackAnchor)
