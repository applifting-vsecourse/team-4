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
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                <Link
                  to={ROUTES.event}
                  params={{ organizationId, eventId: event.id }}
                  className="underline-offset-4 hover:underline"
                >
                  {event.name}
                </Link>
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
