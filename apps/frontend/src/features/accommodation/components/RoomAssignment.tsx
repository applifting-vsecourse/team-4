import { useState, type DragEvent, type ReactNode } from "react"
import { BedDouble, EllipsisVertical, GripVertical, Lock, Users } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import type {
  BoardPerson,
  BoardRoom,
  PlacementBoard,
} from "@/features/accommodation/lib/placements"

export type AssignmentTerm = { id: string; label: string }

export type RoomAssignmentProps = {
  terms: AssignmentTerm[]
  selectedTermId: string
  onSelectTerm: (termId: string) => void
  /** The placements of the selected term; absent while they load or after a failed load. */
  board?: PlacementBoard
  isLoadFailed?: boolean
  onRetryLoad?: () => unknown
  /** Another term is loading: the previous one stays shown but inert. */
  isSwitching?: boolean
  /** A placement is being saved: nothing else can be moved meanwhile. */
  isSaving?: boolean
  /** Places the participant in the room, or removes the placement with `null`. */
  onMove: (personId: string, roomId: string | null) => unknown
  onLock: (personId: string, isLocked: boolean) => unknown
}

const SECTION_TITLE = "Rozdělení do pokojů"
const DRAG_TYPE = "text/plain"

// Správa akce → Ubytování → Rozdělení do pokojů (F14-2): the confirmed
// participants of the selected term, its rooms with their occupancy, and the
// participants without a room. A participant is dragged to a room or to
// "Bez pokoje"; the menu of each participant does the same from the keyboard.
export function RoomAssignment({
  terms,
  selectedTermId,
  onSelectTerm,
  board,
  isLoadFailed = false,
  onRetryLoad,
  isSwitching = false,
  isSaving = false,
  onMove,
  onLock,
}: RoomAssignmentProps) {
  return (
    <PageSection
      title={SECTION_TITLE}
      isBusy={isSaving || isSwitching}
    >
      <Tabs
        value={selectedTermId}
        onValueChange={onSelectTerm}
      >
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

        <TabsContent value={selectedTermId}>
          {isLoadFailed ? (
            <LoadError
              title="Rozdělení do pokojů se nepodařilo načíst"
              onRetry={onRetryLoad}
            />
          ) : !board ? (
            <LoadingBlock
              label="Načítání rozdělení do pokojů"
              className="grid gap-4 lg:grid-cols-3"
            >
              <Skeleton className="h-64" />
              <Skeleton className="h-64 lg:col-span-2" />
            </LoadingBlock>
          ) : board.people.length === 0 ? (
            <EmptyState
              icon={Users}
              title="V termínu nejsou potvrzení účastníci"
            />
          ) : board.rooms.length === 0 ? (
            <EmptyState
              icon={BedDouble}
              title="V termínu nejsou dostupné pokoje"
            />
          ) : (
            <Board
              board={board}
              isInert={isSwitching}
              isSaving={isSaving}
              onMove={onMove}
              onLock={onLock}
            />
          )}
        </TabsContent>
      </Tabs>
    </PageSection>
  )
}

type BoardProps = {
  board: PlacementBoard
  isInert: boolean
  isSaving: boolean
  onMove: RoomAssignmentProps["onMove"]
  onLock: RoomAssignmentProps["onLock"]
}

function Board({ board, isInert, isSaving, onMove, onLock }: BoardProps) {
  // Anything else dropped on a zone (a file, a text) is not a participant and is ignored.
  const drop = (roomId: string | null) => (event: DragEvent) => {
    event.preventDefault()
    const personId = event.dataTransfer.getData(DRAG_TYPE)
    const person = board.people.find((candidate) => candidate.id === personId)
    if (!isSaving && person && person.roomId !== roomId) onMove(person.id, roomId)
  }

  const person = (entry: BoardPerson) => (
    <PersonItem
      key={entry.id}
      person={entry}
      rooms={board.rooms}
      isDisabled={isSaving}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, entry.id)
        event.dataTransfer.effectAllowed = "move"
      }}
      onMove={(roomId) => onMove(entry.id, roomId)}
      onLock={(isLocked) => onLock(entry.id, isLocked)}
    />
  )

  return (
    <div
      inert={isInert}
      className="grid items-start gap-4 lg:grid-cols-3"
    >
      <DropZone
        title={`Bez pokoje (${board.unplaced.length})`}
        onDrop={drop(null)}
      >
        {board.unplaced.length === 0 ? (
          <p className="text-sm text-muted-foreground">Všichni potvrzení účastníci mají pokoj.</p>
        ) : (
          <ul className="space-y-1">{board.unplaced.map(person)}</ul>
        )}
      </DropZone>

      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        {board.rooms.map((room) => (
          <DropZone
            key={room.id}
            title={room.label}
            occupancy={<Occupancy room={room} />}
            onDrop={drop(room.id)}
          >
            {room.people.length === 0 ? (
              <p className="text-sm text-muted-foreground">Volný</p>
            ) : (
              <ul className="space-y-1">{room.people.map(person)}</ul>
            )}
          </DropZone>
        ))}
      </div>
    </div>
  )
}

type DropZoneProps = {
  title: string
  occupancy?: ReactNode
  onDrop: (event: DragEvent) => void
  children: ReactNode
}

function DropZone({ title, occupancy, onDrop, children }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false)
  // The outline marks where a dragged participant lands; the card keeps its own look.
  return (
    <div
      className={cn("rounded-xl", isOver && "outline-2 outline-offset-2 outline-ring")}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        setIsOver(false)
        onDrop(event)
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>{title}</h3>
          </CardTitle>
          {occupancy ? <CardAction>{occupancy}</CardAction> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

function Occupancy({ room }: { room: BoardRoom }) {
  const isOver = room.people.length > room.baseBeds + room.extraBeds
  return (
    <div className="text-right text-sm">
      <p className="font-mono tabular-nums">
        {room.people.length} / {room.baseBeds}
        {room.extraBeds > 0 ? ` + ${room.extraBeds}` : ""}
      </p>
      <p className={cn("font-medium", isOver ? "text-destructive" : "text-muted-foreground")}>
        {isOver ? "Překročena kapacita" : `Volná místa: ${room.free}`}
      </p>
    </div>
  )
}

type PersonItemProps = {
  person: BoardPerson
  rooms: BoardRoom[]
  isDisabled: boolean
  onDragStart: (event: DragEvent) => void
  onMove: (roomId: string | null) => unknown
  onLock: (isLocked: boolean) => unknown
}

function PersonItem({ person, rooms, isDisabled, onDragStart, onMove, onLock }: PersonItemProps) {
  const isPlaced = person.roomId !== null
  const targets = rooms.filter((room) => room.id !== person.roomId)

  return (
    <li
      draggable={!isDisabled}
      onDragStart={onDragStart}
      className="flex items-center gap-2 rounded-md py-1 hover:bg-accent"
    >
      <GripVertical
        aria-hidden
        className="size-4 shrink-0 cursor-grab text-muted-foreground"
      />
      <span className="min-w-0 flex-1 text-sm">{person.name}</span>
      {person.isLocked ? (
        <Lock
          className="size-3.5 shrink-0"
          aria-label="Zamčené umístění"
        />
      ) : null}
      {person.value ? <Badge variant="outline">{person.value}</Badge> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isDisabled}
            aria-label={`Akce: ${person.name}`}
          >
            <EllipsisVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {targets.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {isPlaced ? "Přesunout do pokoje" : "Umístit do pokoje"}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {targets.map((room) => (
                  <DropdownMenuItem
                    key={room.id}
                    onSelect={() => onMove(room.id)}
                  >
                    {room.label} (volná místa: {room.free})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          {isPlaced ? (
            <>
              <DropdownMenuItem onSelect={() => onLock(!person.isLocked)}>
                {person.isLocked ? "Odemknout umístění" : "Zamknout umístění"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onMove(null)}>Odebrat z pokoje</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
