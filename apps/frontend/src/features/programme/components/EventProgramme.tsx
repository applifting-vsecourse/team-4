import { CalendarDays } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCalendarRange } from "@/lib/date"

import { TermProgrammeSection } from "@/features/programme/components/TermProgrammeSection"

type EventProgrammeProps = {
  organizationId: string
  eventId: string
  terms: { id: string; label: string; startDate: string; endDate: string }[]
  /** The term whose programme is managed; it lives in the URL. */
  selectedTermId: string
  onSelectTerm: (termId: string) => void
  /** Called after a saved change, so the item count on the event page reloads. */
  onChanged?: () => unknown
}

// Správa akce → Program (F65-1): one term at a time, chosen in the tabs.
export function EventProgramme({
  organizationId,
  eventId,
  terms,
  selectedTermId,
  onSelectTerm,
  onChanged,
}: EventProgrammeProps) {
  const selected = terms.find((term) => term.id === selectedTermId)
  if (!selected) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Akce zatím nemá žádný termín"
      />
    )
  }
  return (
    <Tabs
      value={selected.id}
      onValueChange={onSelectTerm}
    >
      {/* Many terms scroll inside their row, never the page. */}
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
      <TabsContent value={selected.id}>
        <div className="space-y-4">
          <Badge variant="secondary">
            {formatCalendarRange(selected.startDate, selected.endDate)}
          </Badge>
          <TermProgrammeSection
            key={selected.id}
            organizationId={organizationId}
            eventId={eventId}
            term={selected}
            onChanged={onChanged}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
