import type { ReactNode } from "react"

type PageHeaderProps = {
  breadcrumb?: ReactNode
  title: ReactNode
  /** Status next to the title, e.g. a badge. */
  badge?: ReactNode
  /** Buttons on the right of the title. */
  actions?: ReactNode
  /** One line under the title. */
  description?: ReactNode
}

// Top of a workspace page in the organization shell: breadcrumb, title with
// actions and a short line under it (Wireframy E1, E3, O5).
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
          {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
