import { Fragment, useState } from "react"
import type { DragEvent } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronDown, GripVertical, Users } from "lucide-react"

import { PageSection } from "@/components/PageSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Person = { name: string; value: string }
type Room = { id: string; name: string; capacity: number; people: Person[] }
type Density = "grid" | "rows" | "table"
type BoardData = { rooms: Room[]; unplaced: Person[] }
type DraggedPerson = { personName: string; sourceRoomId: string | null }

const initialRooms: Room[] = [
  {
    id: "javor",
    name: "Chatka 1",
    capacity: 8,
    people: [
      { name: "Anna Dvořáková", value: "Žena" },
      { name: "Eliška Horáková", value: "Žena" },
      { name: "Klára Svobodová", value: "Žena" },
      { name: "Tereza Malá", value: "Žena" },
      { name: "Barbora Veselá", value: "Žena" },
      { name: "Lucie Sedláčková", value: "Žena" },
    ],
  },
  {
    id: "buk",
    name: "Chatka 2",
    capacity: 6,
    people: [
      { name: "Jakub Novák", value: "Muž" },
      { name: "Ondřej Černý", value: "Muž" },
      { name: "Petr Svoboda", value: "Muž" },
      { name: "Tomáš Král", value: "Bez určující hodnoty" },
    ],
  },
  {
    id: "srub",
    name: "Srub u lesa",
    capacity: 4,
    people: [
      { name: "Lucie Kučerová", value: "Žena" },
      { name: "Petr Kučera", value: "Muž" },
    ],
  },
  { id: "lipa", name: "Chatka 3", capacity: 4, people: [] },
]

const initialUnplaced: Person[] = [
  { name: "Matěj Procházka", value: "Muž" },
  { name: "Barbora Malá", value: "Bez určující hodnoty" },
]

function copyInitialBoard(): BoardData {
  return {
    rooms: initialRooms.map((room) => ({ ...room, people: [...room.people] })),
    unplaced: [...initialUnplaced],
  }
}

function Occupancy({ room }: { room: Room }) {
  const free = Math.max(0, room.capacity - room.people.length)
  return (
    <span className="text-sm text-muted-foreground">
      <span className="font-mono text-foreground tabular-nums">
        {room.people.length} z {room.capacity}
      </span>{" "}
      míst · {free} volná
    </span>
  )
}

function CapacityBadge({ room }: { room: Room }) {
  const free = Math.max(0, room.capacity - room.people.length)
  return (
    <Badge variant={free === 0 ? "secondary" : "outline"}>
      {room.people.length}/{room.capacity} míst
    </Badge>
  )
}

function MoveMenu({
  person,
  sourceRoomId,
  rooms,
  onMove,
}: {
  person: Person
  sourceRoomId: string | null
  rooms: Room[]
  onMove: (person: Person, sourceRoomId: string | null, targetRoomId: string | null) => void
}) {
  const targets = rooms.filter(
    (room) => room.id !== sourceRoomId && room.people.length < room.capacity,
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          aria-label={`Přesunout ${person.name}`}
        >
          Přesunout
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {targets.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {sourceRoomId ? "Přesunout do pokoje" : "Umístit do pokoje"}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {targets.map((room) => (
                <DropdownMenuItem
                  key={room.id}
                  onSelect={() => onMove(person, sourceRoomId, room.id)}
                >
                  {room.name} · volná místa {room.capacity - room.people.length}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {sourceRoomId ? (
          <DropdownMenuItem onSelect={() => onMove(person, sourceRoomId, null)}>
            Odebrat z pokoje
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PersonRow({
  person,
  sourceRoomId,
  rooms,
  isSelected,
  onMove,
  onSelect,
  onDragStart,
}: {
  person: Person
  sourceRoomId: string | null
  rooms: Room[]
  isSelected: boolean
  onMove: (person: Person, sourceRoomId: string | null, targetRoomId: string | null) => void
  onSelect: (person: Person, sourceRoomId: string | null) => void
  onDragStart: (event: DragEvent, person: Person, sourceRoomId: string | null) => void
}) {
  return (
    <li
      draggable
      onDragStart={(event) => onDragStart(event, person, sourceRoomId)}
      className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
    >
      <GripVertical
        aria-hidden="true"
        className="size-4 shrink-0 cursor-grab text-muted-foreground"
      />
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelect(person, sourceRoomId)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="truncate">{person.name}</span>
        <Badge variant="outline">{person.value}</Badge>
      </button>
      <MoveMenu
        person={person}
        sourceRoomId={sourceRoomId}
        rooms={rooms}
        onMove={onMove}
      />
    </li>
  )
}

function RoomRoster({
  room,
  rooms,
  selectedPerson,
  isExpanded,
  onExpandedChange,
  onMove,
  onSelect,
  onDragStart,
}: {
  room: Room
  rooms: Room[]
  selectedPerson: DraggedPerson | null
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  onMove: (person: Person, sourceRoomId: string | null, targetRoomId: string | null) => void
  onSelect: (person: Person, sourceRoomId: string | null) => void
  onDragStart: (event: DragEvent, person: Person, sourceRoomId: string | null) => void
}) {
  if (room.people.length === 0) {
    return <p className="text-sm text-muted-foreground">Volný pokoj · přetáhněte sem účastníka</p>
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onExpandedChange}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {room.people[0]?.name}
          {room.people.length > 1 ? ` a dalších ${room.people.length - 1}` : ""}
        </p>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={`${isExpanded ? "Skrýt" : "Zobrazit"} účastníky pokoje ${room.name}`}
          >
            <Users aria-hidden="true" />
            Účastníci · {room.people.length}
            <ChevronDown
              aria-hidden="true"
              className={isExpanded ? "rotate-180" : undefined}
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1 border-t pt-2">
          {room.people.map((person) => (
            <PersonRow
              key={person.name}
              person={person}
              sourceRoomId={room.id}
              rooms={rooms}
              isSelected={selectedPerson?.personName === person.name}
              onMove={onMove}
              onSelect={onSelect}
              onDragStart={onDragStart}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function RoomDropHandlers({
  room,
  onDropPerson,
  onDragEnterRoom,
  onDragLeaveRoom,
}: {
  room: Room
  onDropPerson: (event: DragEvent, targetRoomId: string | null) => void
  onDragEnterRoom: (roomId: string | null) => void
  onDragLeaveRoom: () => void
}) {
  return {
    onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onDragEnter: () => onDragEnterRoom(room.id),
    onDragLeave: onDragLeaveRoom,
    onDrop: (event: DragEvent<HTMLElement>) => onDropPerson(event, room.id),
  }
}

function RoomSlot({
  room,
  board,
  rooms,
  density,
  isSelectedDropTarget,
  isDragOver,
  selectedPerson,
  isExpanded,
  onExpandedChange,
  onMove,
  onSelect,
  onDragStart,
  onDropPerson,
  onDragEnterRoom,
  onDragLeaveRoom,
}: {
  room: Room
  board: BoardData
  rooms: Room[]
  density: Exclude<Density, "table">
  isSelectedDropTarget: boolean
  isDragOver: boolean
  selectedPerson: DraggedPerson | null
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  onMove: (person: Person, sourceRoomId: string | null, targetRoomId: string | null) => void
  onSelect: (person: Person, sourceRoomId: string | null) => void
  onDragStart: (event: DragEvent, person: Person, sourceRoomId: string | null) => void
  onDropPerson: (event: DragEvent, targetRoomId: string | null) => void
  onDragEnterRoom: (roomId: string | null) => void
  onDragLeaveRoom: () => void
}) {
  const handlers = RoomDropHandlers({
    room,
    onDropPerson,
    onDragEnterRoom,
    onDragLeaveRoom,
  })
  return (
    <div
      role="group"
      {...handlers}
      aria-label={`${room.name}, ${room.people.length} z ${room.capacity} míst`}
      className={`min-w-0 rounded-lg border bg-card p-3 transition-colors ${
        isDragOver || isSelectedDropTarget ? "border-primary bg-accent" : ""
      }`}
    >
      <div
        className={
          density === "rows" ? "grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4" : "space-y-2"
        }
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 className="truncate font-medium">{room.name}</h3>
          <CapacityBadge room={room} />
        </div>
        {density === "grid" ? <Occupancy room={room} /> : null}
        <div className={density === "rows" ? "sm:col-span-3" : ""}>
          <RoomRoster
            room={room}
            rooms={rooms}
            selectedPerson={selectedPerson}
            isExpanded={isExpanded}
            onExpandedChange={onExpandedChange}
            onMove={onMove}
            onSelect={onSelect}
            onDragStart={onDragStart}
          />
        </div>
        {isSelectedDropTarget ? (
          <Button
            size="sm"
            onClick={() => {
              if (selectedPerson) {
                const person = findPerson(board, selectedPerson)
                if (person) onMove(person, selectedPerson.sourceRoomId, room.id)
              }
            }}
          >
            Přesunout sem
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function findPerson(board: BoardData, dragged: DraggedPerson): Person | undefined {
  if (dragged.sourceRoomId === null) {
    return board.unplaced.find((person) => person.name === dragged.personName)
  }
  return board.rooms
    .find((room) => room.id === dragged.sourceRoomId)
    ?.people.find((person) => person.name === dragged.personName)
}

function RoomBoard({ density }: { density: Density }) {
  const [board, setBoard] = useState(copyInitialBoard)
  const [expandedRooms, setExpandedRooms] = useState<string[]>([])
  const [selectedPerson, setSelectedPerson] = useState<DraggedPerson | null>(null)
  const [draggedPerson, setDraggedPerson] = useState<DraggedPerson | null>(null)
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null)
  const [moveMessage, setMoveMessage] = useState("")

  const updateExpanded = (roomId: string, isExpanded: boolean) => {
    setExpandedRooms((current) =>
      isExpanded ? [...new Set([...current, roomId])] : current.filter((id) => id !== roomId),
    )
  }

  const movePerson = (person: Person, sourceRoomId: string | null, targetRoomId: string | null) => {
    if (sourceRoomId === targetRoomId) return
    const targetRoom = targetRoomId ? board.rooms.find((room) => room.id === targetRoomId) : null
    if (targetRoom && targetRoom.people.length >= targetRoom.capacity) {
      setMoveMessage(`${targetRoom.name} už nemá volná místa.`)
      return
    }
    setBoard((current) => ({
      rooms: current.rooms.map((room) => {
        const withoutMovedPerson =
          room.id === sourceRoomId
            ? room.people.filter((item) => item.name !== person.name)
            : room.people
        return room.id === targetRoomId
          ? { ...room, people: [...withoutMovedPerson, person] }
          : room.id === sourceRoomId
            ? { ...room, people: withoutMovedPerson }
            : room
      }),
      unplaced:
        sourceRoomId === null
          ? current.unplaced.filter((item) => item.name !== person.name)
          : targetRoomId === null
            ? [...current.unplaced, person]
            : current.unplaced,
    }))
    setSelectedPerson(null)
    setDraggedPerson(null)
    setDragOverRoomId(null)
    const destination = targetRoom?.name ?? "Bez pokoje"
    setMoveMessage(`${person.name} přesunut(a): ${destination}.`)
  }

  const onDragStart = (event: DragEvent, person: Person, sourceRoomId: string | null) => {
    const drag: DraggedPerson = { personName: person.name, sourceRoomId }
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", JSON.stringify(drag))
    setDraggedPerson(drag)
  }

  const onDropPerson = (event: DragEvent, targetRoomId: string | null) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData("text/plain")
    const dropped = raw ? (JSON.parse(raw) as DraggedPerson) : draggedPerson
    if (!dropped) return
    const person =
      dropped.sourceRoomId === null
        ? board.unplaced.find((item) => item.name === dropped.personName)
        : board.rooms
            .find((room) => room.id === dropped.sourceRoomId)
            ?.people.find((item) => item.name === dropped.personName)
    if (person) movePerson(person, dropped.sourceRoomId, targetRoomId)
  }

  const onSelectPerson = (person: Person, sourceRoomId: string | null) => {
    const isAlreadySelected = selectedPerson?.personName === person.name
    setSelectedPerson(isAlreadySelected ? null : { personName: person.name, sourceRoomId })
    setMoveMessage(
      isAlreadySelected
        ? "Výběr zrušen."
        : `${person.name} vybrán(a). Zvolte pokoj, nebo ho přetáhněte.`,
    )
  }

  const isDestination = (room: Room) =>
    selectedPerson !== null &&
    selectedPerson.sourceRoomId !== room.id &&
    room.people.length < room.capacity

  const renderRoom = (room: Room) => (
    <RoomSlot
      key={room.id}
      room={room}
      board={board}
      rooms={board.rooms}
      density={density === "table" ? "grid" : density}
      isSelectedDropTarget={isDestination(room)}
      isDragOver={dragOverRoomId === room.id}
      selectedPerson={selectedPerson}
      isExpanded={expandedRooms.includes(room.id)}
      onExpandedChange={(isExpanded) => updateExpanded(room.id, isExpanded)}
      onMove={movePerson}
      onSelect={onSelectPerson}
      onDragStart={onDragStart}
      onDropPerson={onDropPerson}
      onDragEnterRoom={setDragOverRoomId}
      onDragLeaveRoom={() => setDragOverRoomId(null)}
    />
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Otevřete účastníky pokoje a přetáhněte je do jiného pokoje. Klávesnicí účastníka vyberte a
        zvolte „Přesunout sem“.
      </p>
      <p
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {moveMessage}
      </p>
      {density === "table" ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pokoj</TableHead>
                <TableHead>Obsazení</TableHead>
                <TableHead>Účastníci</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {board.rooms.map((room) => {
                const isExpanded = expandedRooms.includes(room.id)
                const isDropTarget = dragOverRoomId === room.id || isDestination(room)
                return (
                  <Fragment key={room.id}>
                    <TableRow
                      onDragOver={(event) => event.preventDefault()}
                      onDragEnter={() => setDragOverRoomId(room.id)}
                      onDragLeave={() => setDragOverRoomId(null)}
                      onDrop={(event) => onDropPerson(event, room.id)}
                      data-drop-target={isDropTarget}
                    >
                      <TableCell>{room.name}</TableCell>
                      <TableCell>
                        <Occupancy room={room} />
                        {isDropTarget ? (
                          <Badge
                            variant="secondary"
                            className="ml-2"
                          >
                            Pusťte sem
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm text-muted-foreground">
                            {room.people.length === 0
                              ? "Volný pokoj"
                              : `${room.people[0]?.name}${room.people.length > 1 ? ` a dalších ${room.people.length - 1}` : ""}`}
                          </span>
                          {room.people.length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Skrýt" : "Zobrazit"} účastníky pokoje ${room.name}`}
                              onClick={() => updateExpanded(room.id, !isExpanded)}
                            >
                              <Users aria-hidden="true" />
                              Účastníci · {room.people.length}
                              <ChevronDown
                                aria-hidden="true"
                                className={isExpanded ? "rotate-180" : undefined}
                              />
                            </Button>
                          ) : null}
                        </div>
                        {isDestination(room) && selectedPerson ? (
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              const person = findPerson(board, selectedPerson)
                              if (person) {
                                movePerson(person, selectedPerson.sourceRoomId, room.id)
                              }
                            }}
                          >
                            Přesunout sem
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnter={() => setDragOverRoomId(room.id)}
                        onDragLeave={() => setDragOverRoomId(null)}
                        onDrop={(event) => onDropPerson(event, room.id)}
                        data-drop-target={isDropTarget}
                      >
                        <TableCell colSpan={3}>
                          <ul className="grid gap-1 sm:grid-cols-2">
                            {room.people.map((person) => (
                              <PersonRow
                                key={person.name}
                                person={person}
                                sourceRoomId={room.id}
                                rooms={board.rooms}
                                isSelected={selectedPerson?.personName === person.name}
                                onMove={movePerson}
                                onSelect={onSelectPerson}
                                onDragStart={onDragStart}
                              />
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div
          className={
            density === "grid"
              ? "grid gap-3 sm:grid-cols-2"
              : "divide-y rounded-lg border bg-card p-3"
          }
        >
          {board.rooms.map(renderRoom)}
        </div>
      )}

      <div
        role="group"
        aria-label="Účastníci bez pokoje"
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={() => setDragOverRoomId("unplaced")}
        onDragLeave={() => setDragOverRoomId(null)}
        onDrop={(event) => onDropPerson(event, null)}
        className={`rounded-lg border border-dashed p-3 ${
          dragOverRoomId === "unplaced" || (selectedPerson && selectedPerson.sourceRoomId !== null)
            ? "border-primary bg-accent"
            : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h3 className="font-medium">Bez pokoje</h3>
            <span className="text-sm text-muted-foreground">{board.unplaced.length} účastníci</span>
          </div>
          {selectedPerson && selectedPerson.sourceRoomId !== null ? (
            <Button
              size="sm"
              onClick={() => {
                const person = findPerson(board, selectedPerson)
                if (person) movePerson(person, selectedPerson.sourceRoomId, null)
              }}
            >
              Přesunout sem
            </Button>
          ) : null}
        </div>
        {board.unplaced.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {board.unplaced.map((person) => (
              <PersonRow
                key={person.name}
                person={person}
                sourceRoomId={null}
                rooms={board.rooms}
                isSelected={selectedPerson?.personName === person.name}
                onMove={movePerson}
                onSelect={onSelectPerson}
                onDragStart={onDragStart}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Všichni účastníci mají pokoj.</p>
        )}
      </div>
    </div>
  )
}

function RoomAssignmentConcept({ density }: { density: Density }) {
  return (
    <main className="space-y-8 bg-background p-6 text-foreground sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2">Ubytování</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {density === "grid"
              ? "A · Dvousloupcový přehled"
              : density === "rows"
                ? "B · Seznam pokojů"
                : "C · Přehledová tabulka"}
          </p>
        </div>
        <Badge variant="secondary">Rozdělení podle pohlaví</Badge>
      </div>

      <PageSection title="Návrh pokojů">
        <RoomBoard
          key={`proposal-${density}`}
          density={density}
        />
      </PageSection>

      <PageSection title="Rozdělení do pokojů">
        <RoomBoard
          key={`assignment-${density}`}
          density={density}
        />
      </PageSection>
    </main>
  )
}

const meta = {
  title: "Screens/Event/Room Assignment Concepts",
  component: RoomAssignmentConcept,
  args: { density: "grid" },
  globals: { viewport: { value: "organizer1024", isRotated: false } },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RoomAssignmentConcept>

export default meta

type Story = StoryObj<typeof meta>

/** Two-column overview with collapsed rosters and interactive room drop targets. */
export const TwoColumnRooms: Story = { args: { density: "grid" } }

/** A single aligned row per room with the same drag and move interactions. */
export const CompactRows: Story = { args: { density: "rows" } }

/** A scan-friendly table; participant rosters expand within each room row. */
export const OccupancyTable: Story = { args: { density: "table" } }
