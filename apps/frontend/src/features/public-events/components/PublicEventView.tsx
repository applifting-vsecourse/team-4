import { CalendarX } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type PublicEvent } from "@/features/public-events/api/publicEventSchemas"

// Wireframy V1: a draft and an unknown event, with no data of any event.
export function PublicEventUnavailable() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>Akce není dostupná</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

// Content of an open event: name, description, place, terms with prices. The
// form arrives with S2-07; availability is deliberately not shown (S2-08
// decides after submitting).
export function PublicEventView({ event }: { event: PublicEvent }) {
  return (
    <article>
      <h1 className="text-h2 break-words">{event.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{event.location}</p>
      <p className="mt-6 max-w-prose text-sm whitespace-pre-line">{event.description}</p>

      <section
        aria-labelledby="public-terms-heading"
        className="mt-8"
      >
        <h2
          id="public-terms-heading"
          className="mb-4 text-h4"
        >
          Termíny a ceny
        </h2>
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Označení</TableHead>
                <TableHead>Termín</TableHead>
                <TableHead>Cena</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {event.terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.label}</TableCell>
                  <TableCell>{formatCalendarRange(term.startDate, term.endDate)}</TableCell>
                  <TableCell>{formatCzk(term.priceMinor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </article>
  )
}
