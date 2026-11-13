import type { ReactNode } from "react"
import { FileX, type LucideIcon } from "lucide-react"

import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

type RecordUnavailableProps = {
  /** Way back, e.g. a button linking to the list; none where there is no way back. */
  action?: ReactNode
  title?: string
  icon?: LucideIcon
}

// A foreign and a missing record look the same (S2-03).
export function RecordUnavailable({
  action,
  title = "Záznam není dostupný",
  icon: Icon = FileX,
}: RecordUnavailableProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
