import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type InfoCardProps = {
  title: string
  children: ReactNode
  // Small label above the title, e.g. "Krok 1"
  eyebrow?: string
}

// "Informační karta" from the wireframes, built from the kit Card.
export function InfoCard({ title, children, eyebrow }: InfoCardProps) {
  return (
    <Card className="h-full gap-3 rounded-lg p-4">
      {eyebrow ? <p className="text-sm font-semibold text-muted-foreground">{eyebrow}</p> : null}
      <h3 className="text-h4">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </Card>
  )
}
