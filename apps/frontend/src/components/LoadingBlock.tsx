import type { ReactNode } from "react"

type LoadingBlockProps = {
  /** What is loading, read by a screen reader, e.g. "Načítání přihlášek". */
  label: string
  /** Skeleton shapes of the content that is on its way. */
  children: ReactNode
  /** Layout of the skeletons only, e.g. "space-y-2" or a grid. */
  className?: string
}

// The one loading placeholder: a live status region named by its label, so a
// screen reader announces it and no element carries an aria-label without a role.
export function LoadingBlock({ label, children, className }: LoadingBlockProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={className}
    >
      {children}
    </div>
  )
}
