import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/** One room in one term. Unavailable rooms add no places to the term. */
export type RoomTermCapacity = {
  id: string
  label: string
  isAvailable: boolean
  beds: number
  extraBeds: number
  total: number
}

/** A term with the capacity its available rooms give it. */
export type TermCapacity = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–17. 7. 2027". */
  dates: string
  beds: number
  extraBeds: number
  capacity: number
  confirmed: number
  rooms: RoomTermCapacity[]
}

type TermCapacityOverviewProps = {
  terms: TermCapacity[]
  /** The term whose rooms are shown. */
  selectedTermId: string
  /** Without it the tabs keep the selection themselves, starting at `selectedTermId`. */
  onSelectedTermChange?: (termId: string) => void
  onAddRoom?: () => void
  onEditRoom?: (roomId: string) => void
  onDeleteRoom?: (roomId: string) => void
}

// Správa akce → Ubytování → Pokoje (F11-1): base beds, extra beds and their
// sum per room in the selected term. Every number is passed in; the actions
// only report what was asked for.
export function TermCapacityOverview({
  terms,
  selectedTermId,
  onSelectedTermChange,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
}: TermCapacityOverviewProps) {
  const hasRooms = terms.some((term) => term.rooms.length > 0)

  if (terms.length === 0) {
    return (
      <section aria-labelledby="room-capacity-heading">
        <h2
          id="room-capacity-heading"
          className="mb-4 text-h4"
        >
          Pokoje
        </h2>
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BedDouble />
              </EmptyMedia>
              <EmptyTitle>Akce zatím nemá žádné termíny</EmptyTitle>
              <EmptyDescription>
                Kapacita pokojů se nastavuje pro každý termín. Nejdřív přidejte termín v nastavení
                akce.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      </section>
    )
  }

  return (
    <section aria-labelledby="room-capacity-heading">
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2
          id="room-capacity-heading"
          className="text-h4"
        >
          Pokoje
        </h2>
        {hasRooms ? (
          <Button
            variant="outline"
            onClick={onAddRoom}
          >
            <Plus />
            Přidat pokoj
          </Button>
        ) : null}
      </div>

      <Tabs
        {...(onSelectedTermChange
          ? { value: selectedTermId, onValueChange: onSelectedTermChange }
          : { defaultValue: selectedTermId })}
      >
        <TabsList aria-label="Termín">
          {terms.map((term) => (
            <TabsTrigger
              key={term.id}
              value={term.id}
            >
              {term.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {terms.map((term) => (
          <TabsContent
            key={term.id}
            value={term.id}
          >
            <div className="mt-2 space-y-4">
              <Card>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {term.label}, {term.dates}
                  </p>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat
                      label="Základní lůžka"
                      value={term.beds}
                    />
                    <Stat
                      label="Přistýlky"
                      value={term.extraBeds}
                    />
                    <Stat
                      label="Kapacita termínu"
                      value={term.capacity}
                    />
                    <Stat
                      label="Potvrzení účastníci"
                      value={term.confirmed}
                    />
                  </dl>
                </CardContent>
              </Card>

              {term.rooms.length === 0 ? (
                <Card>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BedDouble />
                      </EmptyMedia>
                      <EmptyTitle>Zatím žádné pokoje</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={onAddRoom}>
                        <Plus />
                        Přidat pokoj
                      </Button>
                    </EmptyContent>
                  </Empty>
                </Card>
              ) : (
                <Card padding="none">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pokoj</TableHead>
                        <TableHead>Dostupnost</TableHead>
                        <TableHead className="text-right">Základní lůžka</TableHead>
                        <TableHead className="text-right">Přistýlky</TableHead>
                        <TableHead className="text-right">Celkem</TableHead>
                        <TableHead>
                          <span className="sr-only">Akce</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {term.rooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell>
                            <span className="font-medium">{room.label}</span>
                          </TableCell>
                          <TableCell>
                            {room.isAvailable ? (
                              <Badge variant="success">Dostupný</Badge>
                            ) : (
                              <Badge variant="outline">Nedostupný</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {room.isAvailable ? room.beds : "–"}
                          </TableCell>
                          <TableCell className="text-right">
                            {room.isAvailable ? room.extraBeds : "–"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {room.isAvailable ? room.total : "–"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Upravit pokoj ${room.label}`}
                                onClick={() => onEditRoom?.(room.id)}
                              >
                                <Pencil />
                                Upravit
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Odstranit pokoj ${room.label}`}
                                onClick={() => onDeleteRoom?.(room.id)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2}>Dostupná místa v termínu</TableCell>
                        <TableCell className="text-right">{term.beds}</TableCell>
                        <TableCell className="text-right">{term.extraBeds}</TableCell>
                        <TableCell className="text-right">{term.capacity}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-h3">{value}</dd>
    </div>
  )
}
