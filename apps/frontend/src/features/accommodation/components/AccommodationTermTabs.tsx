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

// The terms of an event as tabs, with the selected term's content below. On
// Ubytování one set of tabs carries the room proposal, the placements and the
// roommate wishes of the term together (#26); a section shown alone has its own.
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
