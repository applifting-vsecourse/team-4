import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type InfoCardProps = {
  title: string
  children: ReactNode
}

// "Informační karta" from the wireframes, built from the kit Card.
export function InfoCard({ title, children }: InfoCardProps) {
  return (
    <Card className="h-full gap-3 rounded-lg p-4">
      <h3 className="text-h4">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </Card>
  )
}
