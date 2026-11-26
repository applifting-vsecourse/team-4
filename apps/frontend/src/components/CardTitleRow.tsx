import type { ReactNode } from "react"

import { CardTitle } from "@/components/ui/card"

// A card title with its action on the same centred line, also when the card is
// narrow; `CardAction` aligns to the top and sits off the title's middle.
export function CardTitleRow({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <CardTitle>{title}</CardTitle>
      {action}
    </div>
  )
}
