import type {
  PlacementChange,
  ProposalLayoutData,
  RoomProposalStatus,
  UnplacedReason,
} from "@/features/accommodation/api/roomProposalSchemas"

// The room proposal of a term (#365, #385) as the screen shows it: names
// instead of ids, rooms instead of room ids, and only what the organizer
// reviews before using a proposal.

export type ProposalPerson = {
  id: string
  name: string
  /** Against the saved placement; null when nothing changes or nothing is saved. */
  change: Exclude<PlacementChange, "unchanged"> | null
  /** The saved room a person moves out of, or loses. */
  savedRoom?: string
  isLocked: boolean
}

export type ProposalRoom = {
  id: string
  label: string
  beds: number
  extraBeds: number
  people: ProposalPerson[]
  /** A locked room the proposal leaves as it is (O5). */
  warning: "mixed" | "overCapacity" | null
}

export type UnplacedPerson = ProposalPerson & { reason: UnplacedReason }

export type LockConflict = { id: string; name: string; room: string }

export type RoomProposalLayout = {
  /** False: a later level ran out of time; the layout is valid but may not be the best. */
  isComplete: boolean
  /** The rooms available in the term, in room order. */
  rooms: ProposalRoom[]
  unplaced: UnplacedPerson[]
  lockConflicts: LockConflict[]
  summary: ProposalLayoutData["summary"]
  /** The proposal read no confirmed participant. */
  isEmpty: boolean
}

export const PROPOSAL_STATUS_BADGE: Record<
  RoomProposalStatus,
  {
    label: string
    variant: "success" | "warning" | "secondary" | "outline" | "destructive-subtle"
  }
> = {
  current: { label: "Aktuální návrh", variant: "success" },
  stale: { label: "Neaktuální návrh", variant: "warning" },
  running: { label: "Navrhuje se", variant: "secondary" },
  failed: { label: "Návrh selhal", variant: "destructive-subtle" },
  timeout: { label: "Návrh nedoběhl", variant: "destructive-subtle" },
  none: { label: "Bez návrhu", variant: "outline" },
}

/** Why a confirmed person has no room (phase-2 spec §6). */
export function unplacedReasonText(reason: UnplacedReason, attribute?: string | null): string {
  switch (reason) {
    case "N":
      return "Termín nemá dostupný pokoj."
    case "K":
      return "Všechna lůžka jsou obsazená."
    case "H":
      return `Volné lůžko je jen v pokoji s jinou hodnotou ${attribute ? `„${attribute}“` : "pravidla ubytování"} nebo v pokoji uzavřeném zámkem.`
  }
}

export function toProposalLayout(layout: ProposalLayoutData): RoomProposalLayout {
  const roomLabel = new Map(layout.rooms.map((room) => [room.id, room.label]))
  const label = (id: string | null) => (id ? (roomLabel.get(id) ?? "") : undefined)
  const people = new Map(
    layout.people.map((person) => [
      person.id,
      {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`.trim() || "Neznámý účastník",
        change: person.change === "unchanged" ? null : person.change,
        savedRoom: person.change === "unchanged" ? undefined : label(person.savedRoomId),
        isLocked: person.isLocked,
      } satisfies ProposalPerson,
    ]),
  )

  return {
    isComplete: layout.isComplete,
    rooms: layout.rooms
      .filter((room) => room.isAvailable)
      .map((room) => ({
        id: room.id,
        label: room.label,
        beds: room.baseBeds,
        extraBeds: room.extraBeds,
        people: room.personIds.flatMap((id) => people.get(id) ?? []),
        warning: room.warning,
      })),
    unplaced: layout.people.flatMap((person) =>
      person.reason ? [{ ...people.get(person.id)!, reason: person.reason }] : [],
    ),
    lockConflicts: layout.people.flatMap((person) =>
      person.isLockConflict
        ? [
            {
              id: person.id,
              name: people.get(person.id)!.name,
              room: label(person.savedRoomId) ?? "",
            },
          ]
        : [],
    ),
    summary: layout.summary,
    isEmpty: layout.people.length === 0,
  }
}

/** What "Použít návrh" changes in the saved placements (#390), by kind. */
export type ApplyChanges = {
  added: { name: string; room: string }[]
  moved: { name: string; from: string; to: string }[]
  removed: { name: string; from: string }[]
}

/** The changes of a layout against the saved placements; locked people never change. */
export function toApplyChanges(layout: RoomProposalLayout): ApplyChanges {
  const placed = layout.rooms.flatMap((room) =>
    room.people.map((person) => ({ person, room: room.label })),
  )
  return {
    added: placed
      .filter(({ person }) => person.change === "new")
      .map(({ person, room }) => ({ name: person.name, room })),
    moved: placed
      .filter(({ person }) => person.change === "moved")
      .map(({ person, room }) => ({ name: person.name, from: person.savedRoom ?? "", to: room })),
    removed: layout.unplaced
      .filter((person) => person.change === "removed")
      .map((person) => ({ name: person.name, from: person.savedRoom ?? "" })),
  }
}

/** Whether applying the layout would change any saved placement. */
export const hasApplyChanges = (changes: ApplyChanges) =>
  changes.added.length + changes.moved.length + changes.removed.length > 0
