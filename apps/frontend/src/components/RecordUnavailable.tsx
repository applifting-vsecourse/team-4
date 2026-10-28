import type { ReactNode } from "react"
import { FileX } from "lucide-react"

import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

type RecordUnavailableProps = {
  /** Way back, e.g. a button linking to the list. */
  action: ReactNode
}

// A foreign and a missing record look the same (S2-03).
export function RecordUnavailable({ action }: RecordUnavailableProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileX />
        </EmptyMedia>
        <EmptyTitle>Záznam není dostupný</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  )
}
