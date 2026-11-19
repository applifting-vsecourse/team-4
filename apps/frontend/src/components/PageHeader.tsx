import type { ReactNode } from "react"

type PageHeaderProps = {
  /** Organization shell only. */
  breadcrumb?: ReactNode
  title: ReactNode
  /** Status next to the title, e.g. a badge. */
  badge?: ReactNode
  /** Buttons on the right of the title. */
  actions?: ReactNode
  /** Short lines under the title, e.g. the place of an event. */
  description?: ReactNode
}

// Top of every page with an h1: organization workspace, participant and public
// pages alike. Auth, error, landing and e-mail pages have their own layout.
export function PageHeader({ breadcrumb, title, badge, actions, description }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h2 break-words">{title}</h1>
            {badge}
          </div>
          {description ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
