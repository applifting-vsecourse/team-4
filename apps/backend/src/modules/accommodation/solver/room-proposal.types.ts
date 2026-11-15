// Input and output of the room proposal (phase 2 of the accommodation solver,
// docs/architecture/accommodation-solver-phase-2.md). One call lays out the
// confirmed participants of one term in rooms; it never decides who takes part.

/** A room of the event in the term, available or not (§3, O6). */
export type ProposalRoom = {
  id: string;
  /** Room order (§2): label in Czech collation with numbers, then id. */
  label: string;
  available: boolean;
  baseBeds: number;
  extraBeds: number;
};

/** A confirmed participant of the term. */
export type ProposalParticipant = {
  id: string;
  /** Person order (§2), 0 = first: `receivedAt`, then registration id. */
  position: number;
  /** Effective value of the hard attribute; null without a hard attribute. */
  value: string | null;
  /** Answers to soft attributes by attribute id; missing or null = unfilled. */
  softValues: Record<string, string | null>;
  /** Saved placement in this term (F14-2), if any. */
  savedRoomId?: string;
  /** Whether the saved placement is locked. */
  locked?: boolean;
  /** Rooms of the person's saved placements in other terms of the event. */
  otherTermRoomIds: string[];
};

/** One-sided wish of `from` to share a room with `to` (#319). */
export type RoommateWish = { from: string; to: string };

/** An item of the ranked soft preference list (§5, U3). */
export type SoftPreference =
  | { kind: 'wishes' }
  | {
      kind: 'attribute';
      id: string;
      /** Answers that do not count; an unfilled answer never counts. */
      neutralValues: string[];
    };

export type RoomProposalInput = {
  rooms: ProposalRoom[];
  hasHardAttribute: boolean;
  participants: ProposalParticipant[];
  /** Wishes of the event; those not between two participants are ignored. */
  wishes: RoommateWish[];
  /** Ranked, most important first. Empty: level U3 is skipped. */
  preferences: SoftPreference[];
};

/**
 * Why a confirmed participant has no room in the proposal (§6).
 * N: no room is available in the term.
 * K: every bed is taken.
 * H: free beds are only in rooms of another hard-attribute value or closed by
 *    a lock.
 */
export type ProposalUnplacedReason = 'N' | 'K' | 'H';

export type WishState =
  | 'satisfied'
  /** Both placed, in different rooms. */
  | 'unsatisfied'
  /** At least one of them has no room (unplaced or in a lock conflict). */
  | 'unplaced'
  /** Different effective values of the hard attribute. */
  | 'impossible';

/** Rooms the proposal leaves as they are and never adds anyone to (O5). */
export type RoomWarning = {
  roomId: string;
  kind: 'mixed' | 'overCapacity';
};

/** Levels U1–U6 of the final layout (§5). */
export type ProposalScores = {
  placed: number;
  /** U2: placed people outside the rooms of their other terms. */
  crossTerm: number;
  /** U3: violations of each preference, in the order of the list. */
  preferences: number[];
  /** U4: unlocked saved placements the proposal changes. */
  moves: number;
  extraBeds: number;
  rooms: number;
};

export type ProposalStats = {
  millis: number;
  solves: number;
  /** False when a level U2–U7 ran out of time; the layout is still valid. */
  complete: boolean;
};

export type RoomProposalResult =
  | {
      status: 'solved';
      /** Room of every placed participant, locked ones included. */
      rooms: Record<string, string>;
      unplaced: { id: string; reason: ProposalUnplacedReason }[];
      /** Locked into a room not available in the term (§6). */
      lockConflicts: { id: string; roomId: string }[];
      warnings: RoomWarning[];
      wishes: (RoommateWish & { state: WishState })[];
      scores: ProposalScores;
      stats: ProposalStats;
    }
  /** U1 did not finish in time; the proposal cannot be used. */
  | { status: 'timeout'; stats: ProposalStats };
