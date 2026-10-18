import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type EntryCardProps = {
  icon: LucideIcon
  audience: string
  title: string
  children: ReactNode
  // The card's buttons
  actions: ReactNode
}

// One of the two "Kudy dál" entries, built from the kit Card.
export function EntryCard({ icon: Icon, audience, title, children, actions }: EntryCardProps) {
  return (
    <Card className="h-full gap-3 p-4">
      <Icon
        aria-hidden
        className="size-6"
      />
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{audience}</p>
        <h3 className="text-h3">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:gap-3">{actions}</div>
    </Card>
  )
}
