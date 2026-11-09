import { type ReactNode } from "react"
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

type EventLink = { organizationId: string; eventId: string }

// The whole row opens the event. Safari does not position content against a <tr>, so a
// single link stretched over the row would cover the whole table; every cell carries its
// own overlay instead. Only the event name is exposed to assistive technology.
function EventCell({ link, children }: { link: EventLink; children: ReactNode }) {
  return (
    <TableCell className="relative">
      {children}
      <Link
        to={ROUTES.event}
        params={link}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0"
      />
    </TableCell>
  )
}

// The events of one organization.
export function EventsTable({ organizationId, events }: EventsTableProps) {
  return (
    <Card className="p-0">
      <Table containerLabel="Akce a turnusy">
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
          {events.map((event) => {
            const link = { organizationId, eventId: event.id }
            return (
              <TableRow key={event.id}>
                <TableCell className="relative max-w-72 py-3">
                  <Link
                    to={ROUTES.event}
                    params={link}
                    className="block truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  >
                    {event.name}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">
                    {event.description}
                  </span>
                </TableCell>
                <EventCell link={link}>{event.location}</EventCell>
                <EventCell link={link}>
                  {event.period
                    ? formatCalendarRange(event.period.startDate, event.period.endDate)
                    : "—"}
                </EventCell>
                <EventCell link={link}>{event.termCount}</EventCell>
                <EventCell link={link}>
                  <EventStatusBadge status={event.status} />
                </EventCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
