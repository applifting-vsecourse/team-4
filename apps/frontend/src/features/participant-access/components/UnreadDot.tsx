import { cn } from "@/lib/utils"

type UnreadDotProps = {
  /** Positioning of the dot within its parent, e.g. over the avatar. */
  className?: string
}

// The only mark of an unread notification (S4-06). It is decorative: the
// meaning reaches assistive technology as text next to it.
export function UnreadDot({ className }: UnreadDotProps) {
  return (
    <span
      aria-hidden
      data-slot="unread-dot"
      className={cn("size-2 shrink-0 rounded-full bg-destructive", className)}
    />
  )
}
