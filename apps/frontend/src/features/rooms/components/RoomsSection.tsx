import { Link } from "@tanstack/react-router"
import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBeds } from "@/lib/beds"
import { formatCalendarRange } from "@/lib/date"

import { type RoomsOverview } from "@/features/rooms/api/roomSchemas"
import { DeleteRoomDialog } from "@/features/rooms/components/DeleteRoomDialog"
import { RoomDialog } from "@/features/rooms/components/RoomDialog"

type RoomsSectionProps = {
  organizationId: string
  eventId: string
  overview: RoomsOverview
  /** Called after a saved change, e.g. to reload the capacity shown elsewhere. */
  onChanged: () => unknown
}

// Rooms of one event and the capacity they give each term (S2-05, Wireframy
// P1). Rooms stay editable after registration opens; the server protects the
// confirmed participants.
export function RoomsSection({ organizationId, eventId, overview, onChanged }: RoomsSectionProps) {
  const { rooms, terms } = overview
  const termLabels = new Map(terms.map((term) => [term.id, term.label]))

  const addButton = (
    <RoomDialog
      organizationId={organizationId}
      eventId={eventId}
      terms={terms}
      onChanged={onChanged}
      trigger={
        <Button variant={rooms.length === 0 ? "default" : "outline"}>
          <Plus />
          Přidat pokoj
        </Button>
      }
    />
  )

  return (
    <div className="space-y-8">
      <section aria-labelledby="capacity-heading">
        <h2
          id="capacity-heading"
          className="mb-4 text-h4"
        >
          Kapacita po termínech
        </h2>
        {terms.length === 0 ? (
          <Alert>
            <AlertDescription>
              Akce zatím nemá žádné termíny, pokoje tedy nemají kde být dostupné.{" "}
              <Link
                to={ROUTES.event}
                params={{ organizationId, eventId }}
                className="text-foreground underline"
              >
                Přidat termín
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {terms.map((term) => (
              <li key={term.id}>
                <Card className="gap-1 px-4 py-3">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                    {term.label}
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatCalendarRange(term.startDate, term.endDate)}
                    </span>
                  </p>
                  <p className="text-xl font-semibold">{formatBeds(term.capacity)}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rooms-heading">
        <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
          <h2
            id="rooms-heading"
            className="text-h4"
          >
            Pokoje
          </h2>
          {rooms.length > 0 ? addButton : null}
        </div>

        {rooms.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BedDouble />
              </EmptyMedia>
              <EmptyTitle>Zatím žádné pokoje</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>{addButton}</EmptyContent>
          </Empty>
        ) : (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Označení</TableHead>
                  <TableHead>Lůžka</TableHead>
                  <TableHead>Dostupné termíny</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Akce</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="pl-4 font-medium">{room.label}</TableCell>
                    <TableCell>{room.bedCount}</TableCell>
                    <TableCell>
                      {room.termIds.length === 0 ? (
                        <span className="text-muted-foreground">
                          Není dostupný v žádném termínu
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {terms
                            .filter((term) => room.termIds.includes(term.id))
                            .map((term) => (
                              <Badge
                                key={term.id}
                                variant="outline"
                              >
                                {termLabels.get(term.id)}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <RoomDialog
                          organizationId={organizationId}
                          eventId={eventId}
                          terms={terms}
                          onChanged={onChanged}
                          room={room}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Upravit pokoj ${room.label}`}
                            >
                              <Pencil />
                              Upravit
                            </Button>
                          }
                        />
                        <DeleteRoomDialog
                          organizationId={organizationId}
                          eventId={eventId}
                          room={room}
                          onChanged={onChanged}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Odstranit pokoj ${room.label}`}
                            >
                              <Trash2 />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  )
}
