import { Link, type LinkComponentProps } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

type BackLinkProps = Omit<LinkComponentProps<"a">, "children" | "className"> & {
  /** Where the link leads, e.g. "Moje přihlášky" or "Zpět na přihlášku". */
  children: string
  /** Layout only, e.g. a bottom margin. */
  className?: string
}

// The way back to the parent page, above the page heading.
export function BackLink({ children, className, ...link }: BackLinkProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      asChild
    >
      <Link {...link}>
        <ArrowLeft aria-hidden />
        {children}
      </Link>
    </Button>
  )
}
