import { BedDouble, CircleAlert, Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type OccupancyRoom = {
  id: string
  label: string
  isAvailable: boolean
  beds: number
  extraBeds: number
  total: number
}

export type OccupancyTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
  confirmed: number
  waitlisted: number
  beds: number
  extraBeds: number
  capacity: number
  free: number
  rooms: OccupancyRoom[]
}

export type TermOccupancyProps = {
  terms: OccupancyTerm[]
  selectedTermId: string
  /** Already formatted, e.g. "dnes 14:32". */
  updatedAt: string
  isRefreshing?: boolean
  /** The load failed: an error with a retry instead of numbers. */
  loadError?: string
  onRefresh?: () => void
  onRetry?: () => void
}

// Správa akce → Ubytování → Obsazenost (F17-1): room data per term. Rooms show
// availability and bed counts only; no person is placed in a room.
export function TermOccupancy({
  terms,
  selectedTermId,
  updatedAt,
  isRefreshing,
  loadError,
  onRefresh,
  onRetry,
}: TermOccupancyProps) {
  return (
    <section
      aria-labelledby="term-occupancy-heading"
      aria-busy={isRefreshing}
    >
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2
          id="term-occupancy-heading"
          className="text-h4"
        >
          Obsazenost po termínech
        </h2>
        {loadError ? null : (
          <Button
            variant="outline"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw />}
            {isRefreshing ? "Aktualizuji…" : "Aktualizovat"}
          </Button>
        )}
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Obsazenost se nepodařilo načíst</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onRetry}
            >
              <RefreshCw />
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Tabs defaultValue={selectedTermId}>
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
                <TermPanel term={term} />
              </TabsContent>
            ))}
          </Tabs>
          <p className="mt-3 text-sm text-muted-foreground">Aktualizováno {updatedAt}</p>
        </>
      )}
    </section>
  )
}

function TermPanel({ term }: { term: OccupancyTerm }) {
  return (
    <div className="mt-2 space-y-4">
      <Card>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {term.label}, {term.dates}
          </p>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Kapacita"
              value={term.capacity}
            />
            <Stat
              label="Potvrzení"
              value={term.confirmed}
            />
            <Stat
              label="Volná místa"
              value={term.free}
            />
            <Stat
              label="Náhradníci"
              value={term.waitlisted}
            />
          </dl>
        </CardContent>
      </Card>

      {term.rooms.length === 0 ? (
        <Alert>
          <BedDouble />
          <AlertTitle>Ubytovací kapacita není evidovaná</AlertTitle>
          <AlertDescription>Akce zatím nemá žádné pokoje.</AlertDescription>
        </Alert>
      ) : (
        <>
          {term.capacity === 0 ? (
            <Alert>
              <BedDouble />
              <AlertTitle>V termínu není dostupný žádný pokoj</AlertTitle>
              <AlertDescription>Dostupná kapacita je 0.</AlertDescription>
            </Alert>
          ) : null}
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pokoj</TableHead>
                  <TableHead>Dostupnost</TableHead>
                  <TableHead className="text-right">Základní lůžka</TableHead>
                  <TableHead className="text-right">Přistýlky</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Dostupná místa v termínu</TableCell>
                  <TableCell className="text-right">{term.beds}</TableCell>
                  <TableCell className="text-right">{term.extraBeds}</TableCell>
                  <TableCell className="text-right">{term.capacity}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        </>
      )}
    </div>
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
