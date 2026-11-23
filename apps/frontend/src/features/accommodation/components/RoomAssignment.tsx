import { useState, type DragEvent, type ReactNode } from "react"
import { BedDouble, ChevronDown, EllipsisVertical, GripVertical, Lock, Users } from "lucide-react"

import { ActionTooltip } from "@/components/ActionTooltip"
import { EmptyState } from "@/components/EmptyState"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useShownLabels } from "@/features/accommodation/lib/attributeLabelsContext"
import type {
  BoardPerson,
  BoardRoom,
  PlacementBoard,
} from "@/features/accommodation/lib/placements"

export type RoomAssignmentProps = {
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
  /** Beside the heading, e.g. the publication of the placements (S4-02). */
  actions?: ReactNode
  /** Above the board, e.g. a failed load of the publication. */
  notice?: ReactNode
}

const SECTION_TITLE = "Uložené rozdělení"
const DRAG_TYPE = "text/plain"

// Správa akce → Ubytování → Rozdělení do pokojů (F14-2): the confirmed
// participants of the selected term, its rooms with their occupancy, and the
// participants without a room. A participant is dragged to a room or to
// "Bez pokoje"; the menu of each participant does the same from the keyboard.
export function RoomAssignment({
  board,
  isLoadFailed = false,
  onRetryLoad,
  isSwitching = false,
  isSaving = false,
  onMove,
  onLock,
  actions,
  notice,
}: RoomAssignmentProps) {
  const content = (
    <>
      {notice}
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
        <>
          <RuleLabel hardAttribute={board.hardAttribute} />
          <EmptyState
            icon={Users}
            title="V termínu nejsou potvrzení účastníci"
          />
        </>
      ) : (
        <>
          <RuleLabel hardAttribute={board.hardAttribute} />
          <Board
            board={board}
            isInert={isSwitching}
            isSaving={isSaving}
            onMove={onMove}
            onLock={onLock}
          />
        </>
      )}
    </>
  )

  return (
    <PageSection
      title={SECTION_TITLE}
      isBusy={isSaving || isSwitching}
      actions={actions}
    >
      {content}
    </PageSection>
  )
}

function RuleLabel({ hardAttribute }: { hardAttribute: string | null }) {
  const labels = useShownLabels()
  return (
    <p className="mb-3 text-sm text-muted-foreground">
      {hardAttribute
        ? `Rozdělení podle ${labels.attribute(hardAttribute).toLocaleLowerCase("cs")}`
        : "Bez tvrdého pravidla"}
    </p>
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
    if (!isSaving && person && !person.isLocked && person.roomId !== roomId) {
      onMove(person.id, roomId)
    }
  }

  const person = (entry: BoardPerson) => (
    <PersonItem
      key={entry.id}
      person={entry}
      shouldShowValue={Boolean(board.hardAttribute)}
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
      className="space-y-4"
    >
      <DropZone
        title="Bez pokoje"
        count={board.unplaced.length}
        description={
          board.unplaced.length === 0
            ? "Přetáhněte sem účastníka pro odebrání z pokoje."
            : undefined
        }
        onDrop={drop(null)}
      >
        {board.unplaced.length > 0 ? (
          <ul className="space-y-1">{board.unplaced.map(person)}</ul>
        ) : null}
      </DropZone>

      {board.rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="V termínu nejsou dostupné pokoje"
        />
      ) : (
        <ul className="space-y-2">
          {board.rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              onDrop={room.isAvailable ? drop(room.id) : undefined}
            >
              {room.people.length > 0 ? (
                <ul className="space-y-1">{room.people.map(person)}</ul>
              ) : (
                <p className="text-sm text-muted-foreground">Volný</p>
              )}
            </RoomRow>
          ))}
        </ul>
      )}
    </div>
  )
}

function RoomRow({
  room,
  onDrop,
  children,
}: {
  room: BoardRoom
  onDrop?: (event: DragEvent) => void
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isOver, setIsOver] = useState(false)
  const isOverCapacity = room.people.length > room.baseBeds + room.extraBeds

  return (
    <li>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <section
          aria-label={`Pokoj ${room.label}`}
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-card",
            isOver && "outline-2 outline-offset-2 outline-ring",
          )}
          onDragOver={
            onDrop
              ? (event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                  setIsOver(true)
                }
              : undefined
          }
          onDragLeave={() => setIsOver(false)}
          onDrop={
            onDrop
              ? (event) => {
                  setIsOver(false)
                  onDrop(event)
                }
              : undefined
          }
        >
          <div className="flex min-w-0 items-center gap-2 bg-muted p-2 sm:gap-3 sm:px-4">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="group h-auto min-h-10 min-w-0 flex-1 justify-start text-left whitespace-normal"
                aria-label={`${room.label}, ${room.people.length} obsazeno, ${room.isAvailable ? (isOverCapacity ? "překročena kapacita" : `${room.free} volných míst`) : "nedostupný pokoj"}`}
              >
                <ChevronDown
                  aria-hidden
                  className="shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0 font-semibold">{room.label}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-normal">
                    {room.isAvailable ? (
                      <span
                        className={cn(
                          "text-sm",
                          isOverCapacity ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        <span className="font-mono text-foreground tabular-nums">
                          {room.people.length} / {room.baseBeds}
                          {room.extraBeds > 0 ? ` + ${room.extraBeds}` : ""}
                        </span>{" "}
                        · {isOverCapacity ? "Překročena kapacita" : `volná místa ${room.free}`}
                      </span>
                    ) : (
                      <span className="text-sm text-destructive">Nedostupný pokoj</span>
                    )}
                    <RoomFlags room={room} />
                  </span>
                </span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="border-t border-border bg-card px-3 py-3 sm:px-4">{children}</div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    </li>
  )
}

type DropZoneProps = {
  title: string
  count: number
  description?: string
  /** Without it the zone accepts no drop. */
  onDrop?: (event: DragEvent) => void
  children: ReactNode
}

function DropZone({ title, count, description, onDrop, children }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false)
  // The outline marks where a dragged participant lands; the card keeps its own look.
  return (
    <div
      role="region"
      aria-label={`${title} (${count})`}
      className={cn(
        "rounded-lg border border-dashed bg-card px-3",
        isOver && "outline-2 outline-offset-2 outline-ring",
      )}
      onDragOver={
        onDrop
          ? (event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
              setIsOver(true)
            }
          : undefined
      }
      onDragLeave={() => setIsOver(false)}
      onDrop={
        onDrop
          ? (event) => {
              setIsOver(false)
              onDrop(event)
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 py-2">
        <h3 className="font-medium">
          {title} ({count})
        </h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {count > 0 ? <p className="text-sm text-muted-foreground">Účastníci</p> : null}
      </div>
      {count > 0 ? <div className="pb-2">{children}</div> : null}
    </div>
  )
}

/**
 * A rule the room breaks now, also one that appeared after placing (a changed
 * answer or determination). A mixed room the organizer confirmed reads as an
 * exception; one that turned mixed on its own as a warning.
 */
function RoomFlags({ room }: { room: BoardRoom }) {
  const isMixed = room.warnings.includes("mixed")
  const hasExtraBed = room.warnings.includes("extra_bed")
  if (!isMixed && !hasExtraBed) return null
  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      {isMixed ? (
        room.confirmedWarnings.includes("mixed") ? (
          <Badge variant="secondary">Smíšený, výjimka</Badge>
        ) : (
          <Badge variant="warning">Smíšený pokoj</Badge>
        )
      ) : null}
      {hasExtraBed ? <Badge variant="secondary">Přistýlka</Badge> : null}
    </span>
  )
}

type PersonItemProps = {
  person: BoardPerson
  shouldShowValue: boolean
  rooms: BoardRoom[]
  isDisabled: boolean
  onDragStart: (event: DragEvent) => void
  onMove: (roomId: string | null) => unknown
  onLock: (isLocked: boolean) => unknown
}

function PersonItem({
  person,
  rooms,
  shouldShowValue,
  isDisabled,
  onDragStart,
  onMove,
  onLock,
}: PersonItemProps) {
  const isPlaced = person.roomId !== null
  // A locked placement is neither moved nor removed until it is unlocked.
  const isMovable = !person.isLocked
  const targets = rooms.filter((room) => room.id !== person.roomId && room.isAvailable)

  return (
    <li
      draggable={!isDisabled && isMovable}
      onDragStart={onDragStart}
      className="flex items-center gap-2 rounded-md py-1 hover:bg-accent"
    >
      <GripVertical
        aria-hidden
        className="size-4 shrink-0 cursor-grab text-muted-foreground"
      />
      <span className="min-w-0 flex-1 text-sm">{person.name}</span>
      {person.isLocked ? (
        <ActionTooltip label="Změna pokoje vyžaduje odemčení">
          <span
            role="img"
            aria-label="Zamčené umístění"
            aria-describedby={`locked-placement-${person.id}`}
            className="shrink-0"
          >
            <Lock
              className="size-3.5"
              aria-hidden
            />
          </span>
        </ActionTooltip>
      ) : null}
      {person.isLocked ? (
        <span
          id={`locked-placement-${person.id}`}
          className="sr-only"
        >
          Změna pokoje vyžaduje odemčení
        </span>
      ) : null}
      {shouldShowValue ? (
        <Badge variant="outline">{person.value ?? "Bez určující hodnoty"}</Badge>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionTooltip label="Akce účastníka">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isDisabled}
              aria-label={`Akce: ${person.name}`}
            >
              <EllipsisVertical aria-hidden />
            </Button>
          </ActionTooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isMovable && targets.length > 0 ? (
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
              {isMovable ? (
                <DropdownMenuItem onSelect={() => onMove(null)}>Odebrat z pokoje</DropdownMenuItem>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
