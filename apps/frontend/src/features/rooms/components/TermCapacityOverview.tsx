import { Link } from "@tanstack/react-router"
import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { PageSection } from "@/components/PageSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  organizationId: string
  eventId: string
  /** The term whose rooms are shown. */
  selectedTermId: string
  onAddRoom?: () => void
  onEditRoom?: (roomId: string) => void
  onDeleteRoom?: (roomId: string) => void
}

// Správa akce → Ubytování → Pokoje (F11-1): base beds, extra beds and their
// sum per room in the selected term. Every number is passed in; the actions
// only report what was asked for.
export function TermCapacityOverview({
  terms,
  organizationId,
  eventId,
  selectedTermId,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
}: TermCapacityOverviewProps) {
  const term = terms.find((item) => item.id === selectedTermId)

  if (terms.length === 0) {
    return (
      <PageSection title="Pokoje">
        <EmptyState
          icon={BedDouble}
          title="Akce zatím nemá žádné termíny"
          description="Kapacita pokojů se nastavuje pro každý termín. Nejdřív přidejte termín v nastavení akce."
          action={
            <Button asChild>
              <Link
                to={ROUTES.eventSettings}
                params={{ organizationId, eventId }}
                hash="terms-heading"
              >
                Přidat termín
              </Link>
            </Button>
          }
        />
      </PageSection>
    )
  }

  if (!term) return null

  return (
    <PageSection
      title="Pokoje"
      actions={
        <Button
          variant="outline"
          onClick={onAddRoom}
        >
          <Plus />
          Přidat pokoj
        </Button>
      }
    >
      <div className="space-y-4">
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
          <EmptyState
            icon={BedDouble}
            title="Zatím žádné pokoje"
          />
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
                      <span className="font-medium">{room.isAvailable ? room.total : "–"}</span>
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
    </PageSection>
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
