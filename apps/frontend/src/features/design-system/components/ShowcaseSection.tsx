import type { ReactNode } from "react"

type ShowcaseSectionProps = {
  id: string
  title: string
  description?: string
  children: ReactNode
}

export function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-4 border-t border-border pt-8"
    >
      <div className="space-y-1">
        <h2
          id={id}
          className="text-h3"
        >
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

type ShowcaseItemProps = {
  label: string
  children: ReactNode
}

export function ShowcaseItem({ label, children }: ShowcaseItemProps) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
