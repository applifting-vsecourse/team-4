import { createContext, useContext, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type Layout = "inline" | "stacked"

const LayoutContext = createContext<Layout>("inline")

type DefinitionListProps = {
  /** `inline`: label left, value right (amounts, dates). `stacked`: label above a longer value. */
  layout?: Layout
  children: ReactNode
  /** Layout only, e.g. a separator above the list. */
  className?: string
}

// Label and value pairs of a record, e.g. contact details or a payment overview.
export function DefinitionList({ layout = "inline", children, className }: DefinitionListProps) {
  return (
    <LayoutContext value={layout}>
      <dl className={cn("text-sm", layout === "inline" ? "space-y-2" : "space-y-3", className)}>
        {children}
      </dl>
    </LayoutContext>
  )
}

type DefinitionRowProps = {
  label: string
  children: ReactNode
  /** The total of an inline list, e.g. „Zbývá zaplatit“: a bold label below a separator. */
  isEmphasised?: boolean
}

export function DefinitionRow({ label, children, isEmphasised = false }: DefinitionRowProps) {
  const layout = useContext(LayoutContext)

  if (layout === "stacked") {
    return (
      <div className="space-y-1">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="wrap-break-word">{children}</dd>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-wrap justify-between gap-x-4 gap-y-1",
        isEmphasised && "items-baseline not-first:border-t not-first:border-border not-first:pt-2",
      )}
    >
      <dt className={isEmphasised ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
