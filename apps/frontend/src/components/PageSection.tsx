import { useId, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageSectionProps = {
  /** The section's second-level heading; also the name of its region. */
  title: ReactNode
  /** One line under the heading. */
  description?: ReactNode
  /** Buttons on the right of the heading. */
  actions?: ReactNode
  children: ReactNode
  /** While its content refreshes, e.g. a list refetching. */
  isBusy?: boolean
  /** Only when a link points at the section (`#publication-heading`); otherwise generated. */
  headingId?: string
  /** Layout only, e.g. a top margin. */
  className?: string
}

// A titled part of a page: a region named by its h2, actions on the right of
// the heading and one gap to the content.
export function PageSection({
  title,
  description,
  actions,
  children,
  isBusy,
  headingId: givenId,
  className,
}: PageSectionProps) {
  const generatedId = useId()
  const headingId = givenId ?? generatedId
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isBusy}
      className={cn("space-y-4", className)}
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-h4"
          >
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
