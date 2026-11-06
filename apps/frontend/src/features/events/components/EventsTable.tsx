import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
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

// The events of one organization.
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow
              key={event.id}
              className="relative cursor-pointer"
            >
              <TableCell className="max-w-72 py-3">
                {/* The link stretches over the whole row, so any part of it opens the event. */}
                <Link
                  to={ROUTES.event}
                  params={{ organizationId, eventId: event.id }}
                  className="block truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {event.name}
                </Link>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
