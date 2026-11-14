import type { ReactNode } from "react"

type LoadingBlockProps = {
  /** What is loading, read by a screen reader, e.g. "Načítání přihlášek". */
  label: string
  /** Skeleton shapes of the content that is on its way. */
  children: ReactNode
  /** Layout of the skeletons only, e.g. "space-y-2" or a grid. */
  className?: string
}

// The one loading placeholder: a live status region named by its label, so no
// element carries an aria-label without a role. A live region announces its
// text, not its name, and the skeletons have none: the label is also its text.
export function LoadingBlock({ label, children, className }: LoadingBlockProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
