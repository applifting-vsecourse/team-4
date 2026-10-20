import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCalendarRange } from "@/lib/date"

import { type EventSummary } from "@/features/events/api/eventSchemas"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"

type EventsTableProps = {
  organizationId: string
  events: EventSummary[]
}

// Wireframy W02 "Akce": the events of one organization.
export function EventsTable({ organizationId, events }: EventsTableProps) {
  return (
    <Card className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Akce</TableHead>
            <TableHead>Místo</TableHead>
            <TableHead>Období</TableHead>
            <TableHead>Termíny</TableHead>
            <TableHead>Stav</TableHead>
            <TableHead>
              <span className="sr-only">Otevřít</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="max-w-72 py-3">
                <span className="block truncate font-medium">{event.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {event.description}
                </span>
              </TableCell>
              <TableCell>{event.location}</TableCell>
              <TableCell>
                {event.period
                  ? formatCalendarRange(event.period.startDate, event.period.endDate)
                  : "—"}
              </TableCell>
              <TableCell>{event.termCount}</TableCell>
              <TableCell>
                <EventStatusBadge status={event.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                >
                  <Link
                    to={ROUTES.event}
                    params={{ organizationId, eventId: event.id }}
                    aria-label={`Otevřít akci ${event.name}`}
                  >
                    Otevřít
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
