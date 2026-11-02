// Input and output of the accommodation solver (S3-T3, spec v4 §7). One call
// evaluates one term: terms never share capacity and are confirmed separately.

/** A room available in the term, with that term's beds (F11-1). */
export type SolverRoom = {
  id: string;
  baseBeds: number;
  extraBeds: number;
};

/** Values of the ranked soft attributes, keyed by attribute id (phase 2). */
export type SoftValues = Record<string, string>;

/** Already confirmed in the term: a fixed input the solver never removes. */
export type ConfirmedParticipant = {
  id: string;
  /** Effective value of the hard attribute; null without a hard attribute. */
  value: string | null;
  softValues?: SoftValues;
  /** Phase 2: the room the participant stays in. */
  roomId?: string;
};

/** Pending or waitlisted in the term. */
export type Candidate = {
  id: string;
  /**
   * Effective value of the hard attribute (own determining answer or the
   * organizer's determination). Null with a hard attribute means the
   * participant needs a manual determination and is not evaluated (reason R).
   */
  value: string | null;
  /** Position in the term's order, 0 = highest priority. Unique. */
  position: number;
  softValues?: SoftValues;
};

export type SolverInput = {
  rooms: SolverRoom[];
  /** Whether rooms must be homogeneous in one hard attribute. */
  hasHardAttribute: boolean;
  /** Soft attribute ids, most important first (phase 2). */
  softAttributes?: string[];
  confirmed: ConfirmedParticipant[];
  candidates: Candidate[];
};

/**
 * Why a candidate is not suitable in the proposal (spec §7.5).
 * A: capacity is filled by confirmed and higher-priority participants.
 * B: free beds are only in rooms carrying another hard-attribute value.
 * C: accommodating them would lower the number accommodated.
 * N: the term has no available capacity.
 * R: needs a manual determination of accommodation.
 */
export type UnplacedReason = 'A' | 'B' | 'C' | 'N' | 'R';

export type SolverStats = {
  /** Wall-clock time of the whole evaluation. */
  millis: number;
  /** HiGHS runs, including feasibility checks of the priority stage. */
  solves: number;
  /**
   * False when a room-layout level (3–5) ran out of time and the best layout
   * found so far was kept. Who is suitable is always exact.
   */
  complete: boolean;
};

export type SolverResult =
  | {
      status: 'solved';
      /** Candidates suitable for confirmation, by position. */
      suitable: string[];
      unplaced: { id: string; reason: UnplacedReason }[];
      /** Room of every accommodated participant; internal in phase 1. */
      rooms: Record<string, string>;
      /** Hard-attribute value each used room carries; null when not set. */
      roomValues: Record<string, string | null>;
      beds: {
        baseUsed: number;
        extraUsed: number;
        base: number;
        extra: number;
      };
      stats: SolverStats;
    }
  | {
      status: 'infeasible';
      /** Confirmed participants who no longer fit (spec §7.4). */
      conflicting: string[];
      constraint: 'capacity' | 'homogeneity';
      stats: SolverStats;
    }
  | { status: 'timeout'; stats: SolverStats };
