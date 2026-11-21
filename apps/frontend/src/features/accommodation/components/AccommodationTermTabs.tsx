import type { ReactNode } from "react"

import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type AccommodationTermTabsProps = {
  terms: { id: string; label: string }[]
  selectedTermId: string
  onSelectTerm?: (termId: string) => void
  /** The content of the selected term. */
  children: ReactNode
}

// Ubytování: the terms of the event as tabs, with the selected term's room
// proposal, placements and roommate wishes below, under one selection (#26).
export function AccommodationTermTabs({
  terms,
  selectedTermId,
  onSelectTerm,
  children,
}: AccommodationTermTabsProps) {
  return (
    <Tabs
      value={selectedTermId}
      onValueChange={onSelectTerm}
    >
      <HorizontalOverflowViewport>
        <TabsList
          aria-label="Termín"
          className="w-max min-w-full"
        >
          {terms.map((term) => (
            <TabsTrigger
              key={term.id}
              value={term.id}
            >
              {term.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </HorizontalOverflowViewport>
      <TabsContent value={selectedTermId}>{children}</TabsContent>
    </Tabs>
  )
}
