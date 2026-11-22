import { compareRooms } from '@/modules/accommodation/solver/room-proposal-layout';
import type {
  ProposalScores,
  ProposalUnplacedReason,
  RoomProposalInput,
  RoomProposalResult,
  RoomWarning,
  WishState,
} from '@/modules/accommodation/solver/room-proposal.types';

// What the organizer sees of a term's room proposal (spec §7, S4-11 #385):
// the last proposal, whether it still stands for the term, and its layout
// against the saved placements. Reading never proposes.

/** How a stored proposal ended (§7.3); phase 2 has no `infeasible`. */
export type ProposalStatus = 'solved' | 'timeout' | 'failed';

export type ProposalViewStatus =
  /** No proposal yet. */
  | 'none'
  /** A proposal runs or the organizer asked for one. */
  | 'running'
  /** The last proposal read the term's current layout version. */
  | 'current'
  /**
   * The last proposal was applied ("Použít návrh", §7.2) and nothing changed
   * since: the saved placements are its rooms. Its own layout version is
   * older, as applying moved the term's on.
   */
  | 'applied'
  /** A layout change came after the last proposal (§7.1). */
  | 'stale'
  /** The last proposal failed; nothing usable. */
  | 'failed'
  /** U1 of the last proposal did not finish (§7); nothing usable. */
  | 'timeout';

/** How the proposal changes a person's saved placement (§7.2). */
export type PlacementChange = 'new' | 'moved' | 'removed' | 'unchanged';

export type ProposalPersonView = {
  id: string;
  firstName: string;
  lastName: string;
  /** Effective value of the hard attribute; null without one. */
  value: string | null;
  /** The proposed room; null when unplaced or in a lock conflict. */
  roomId: string | null;
  savedRoomId: string | null;
  isLocked: boolean;
  /** Why the person has no room (§6). */
  reason: ProposalUnplacedReason | null;
  /** Locked to a room the term does not offer (§6). */
  isLockConflict: boolean;
  /** Null for someone with no saved and no proposed room. */
  change: PlacementChange | null;
};

export type ProposalRoomView = {
  id: string;
  label: string;
  isAvailable: boolean;
  baseBeds: number;
  extraBeds: number;
  /** The people the proposal puts in the room, in person order. */
  personIds: string[];
  /** A locked room left as it is (O5). */
  warning: RoomWarning['kind'] | null;
};

export type ProposalSummary = {
  placed: number;
  unplaced: number;
  lockConflicts: number;
  added: number;
  moved: number;
  removed: number;
  /** Rooms with anyone in them (U6). */
  rooms: number;
  /** Extra beds taken (U5). */
  extraBeds: number;
};

export type ProposalLayoutView = {
  /** False when a level U2–U7 ran out of time: "Rozdělení nemusí být nejlepší možné". */
  isComplete: boolean;
  rooms: ProposalRoomView[];
  /** Every confirmed participant the proposal read, in person order. */
  people: ProposalPersonView[];
  wishes: { from: string; to: string; state: WishState }[];
  scores: ProposalScores;
  summary: ProposalSummary;
};

export type StoredProposalView = {
  id: string;
  status: ProposalStatus;
  /** The hard attribute used when this proposal was calculated, if any. */
  hardAttribute: string | null;
  triggeredBy: { id: string; name: string } | null;
  startedAt: Date;
  finishedAt: Date;
  layoutVersion: number;
  isCurrent: boolean;
  /** When it was applied, while nothing changed since; null otherwise. */
  appliedAt: Date | null;
  /** A solved proposal only. */
  layout: ProposalLayoutView | null;
};

export type ProposalTermView = {
  status: ProposalViewStatus;
  /** The term's layout version now (§7.1). */
  layoutVersion: number;
  /** The last proposal, whatever its status. */
  proposal: StoredProposalView | null;
  /**
   * The newest solved proposal: the one to show and apply (§7.2) even when
   * a later run failed or timed out. The same as `proposal` when that is solved.
   */
  lastSolved: StoredProposalView | null;
};

export type StoredProposal = {
  id: string;
  status: ProposalStatus;
  /** Read from the immutable input snapshot, not current event settings. */
  hardAttribute: string | null;
  triggeredBy: { id: string; name: string } | null;
  startedAt: Date;
  finishedAt: Date;
  layoutVersion: number;
  input: RoomProposalInput;
  result: RoomProposalResult | null;
  /** Its newest application: the term's layout version after it, and when. */
  lastApplied: { layoutVersion: number; at: Date } | null;
};

export type Names = ReadonlyMap<
  string,
  { firstName: string; lastName: string }
>;

function changeOf(
  saved: string | null,
  proposed: string | null,
): PlacementChange | null {
  if (saved === null) return proposed === null ? null : 'new';
  if (proposed === null) return 'removed';
  return saved === proposed ? 'unchanged' : 'moved';
}

/** The layout of a solved proposal against the saved placements it read. */
export function buildLayout(
  input: RoomProposalInput,
  result: Extract<RoomProposalResult, { status: 'solved' }>,
  names: Names,
): ProposalLayoutView {
  const reasons = new Map(result.unplaced.map((u) => [u.id, u.reason]));
  const conflicts = new Set(result.lockConflicts.map((c) => c.id));
  const participants = [...input.participants].sort(
    (a, b) => a.position - b.position,
  );

  const people = participants.map((p): ProposalPersonView => {
    const roomId = result.rooms[p.id] ?? null;
    const isLockConflict = conflicts.has(p.id);
    const savedRoomId = p.savedRoomId ?? null;
    const name = names.get(p.id);
    return {
      id: p.id,
      firstName: name?.firstName ?? '',
      lastName: name?.lastName ?? '',
      value: p.value,
      roomId,
      savedRoomId,
      isLocked: p.locked ?? false,
      reason: reasons.get(p.id) ?? null,
      isLockConflict,
      // A lock conflict keeps its saved room: applying moves nobody locked.
      change: isLockConflict ? null : changeOf(savedRoomId, roomId),
    };
  });

  const warnings = new Map(result.warnings.map((w) => [w.roomId, w.kind]));
  const rooms = [...input.rooms]
    .sort(compareRooms)
    .map((room): ProposalRoomView => ({
      id: room.id,
      label: room.label,
      isAvailable: room.available,
      baseBeds: room.baseBeds,
      extraBeds: room.extraBeds,
      personIds: people.filter((p) => p.roomId === room.id).map((p) => p.id),
      warning: warnings.get(room.id) ?? null,
    }));

  const count = (change: PlacementChange): number =>
    people.filter((p) => p.change === change).length;
  return {
    isComplete: result.stats.complete,
    rooms,
    people,
    wishes: result.wishes,
    scores: result.scores,
    summary: {
      placed: people.filter((p) => p.roomId !== null).length,
      unplaced: result.unplaced.length,
      lockConflicts: result.lockConflicts.length,
      added: count('new'),
      moved: count('moved'),
      removed: count('removed'),
      rooms: result.scores.rooms,
      extraBeds: result.scores.extraBeds,
    },
  };
}

function storedView(
  stored: StoredProposal,
  layoutVersion: number,
  names: Names,
): StoredProposalView {
  return {
    id: stored.id,
    status: stored.status,
    hardAttribute: stored.hardAttribute,
    triggeredBy: stored.triggeredBy,
    startedAt: stored.startedAt,
    finishedAt: stored.finishedAt,
    layoutVersion: stored.layoutVersion,
    isCurrent: stored.layoutVersion === layoutVersion,
    appliedAt:
      stored.lastApplied?.layoutVersion === layoutVersion
        ? stored.lastApplied.at
        : null,
    layout:
      stored.result?.status === 'solved'
        ? buildLayout(stored.input, stored.result, names)
        : null,
  };
}

export function buildProposalView({
  latest,
  lastSolved,
  layoutVersion,
  isRunning,
  names,
}: {
  latest: StoredProposal | null;
  lastSolved: StoredProposal | null;
  layoutVersion: number;
  isRunning: boolean;
  names: Names;
}): ProposalTermView {
  const proposal = latest && storedView(latest, layoutVersion, names);
  const status: ProposalViewStatus = isRunning
    ? 'running'
    : proposal === null
      ? 'none'
      : proposal.status === 'solved'
        ? proposal.isCurrent
          ? 'current'
          : proposal.appliedAt
            ? 'applied'
            : 'stale'
        : proposal.status;
  return {
    status,
    layoutVersion,
    proposal,
    lastSolved:
      lastSolved === null
        ? null
        : lastSolved.id === latest?.id
          ? proposal
          : storedView(lastSolved, layoutVersion, names),
  };
}
