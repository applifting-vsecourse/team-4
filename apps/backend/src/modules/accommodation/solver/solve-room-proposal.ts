import { toLp } from './assignment-model';
import { HighsRunner, loadHighs, TimeLimit } from './highs-runner';
import { layoutOf, solveExactLevels } from './room-proposal-exact';
import {
  Layout,
  PreparedProposal,
  prepareProposal,
  scoreLayout,
  unplacedReasons,
  wishStates,
} from './room-proposal-layout';
import { buildProposalModel } from './room-proposal-model';
import { placeByPriority } from './room-proposal-placement';
import { DEFAULT_BUDGET, searchLayout } from './room-proposal-search';
import {
  ProposalStats,
  RoomProposalInput,
  RoomProposalResult,
} from './room-proposal.types';

// Room proposal of one term (phase 2, docs/architecture/
// accommodation-solver-phase-2.md), as decided in ADR-0002:
//   1. U1 exactly on an aggregate HiGHS model (room-proposal-placement.ts):
//      most confirmed placed, then priority by person order. Out of time, the
//      proposal is a timeout and cannot be used.
//   2. A starting layout from it that keeps saved rooms where it can.
//   3. U2–U7 by deterministic local search (room-proposal-search.ts),
//      re-run from its own result as if applied, while that improves it.
// `exact` solves every level on the room-level model instead; it is the test
// oracle and proves optimality on small terms only.

/** Re-search rounds at most; each one has to improve the proposal. */
const MAX_ROUNDS = 2;

/**
 * The proposal as the organizer would see it after applying `layout`: its
 * rooms are the unlocked saved placements. Rooms of other terms keep counting
 * as in the original input, so the re-search cannot trade U2 away.
 */
function appliedAs(
  prepared: PreparedProposal,
  layout: Layout,
): PreparedProposal {
  const free = (i: number): boolean =>
    !prepared.locked.has(i) && layout[i] !== undefined;
  return {
    ...prepared,
    participants: prepared.participants.map((p, i) =>
      free(i) ? { ...p, savedRoomId: prepared.rooms[layout[i]!]!.id } : p,
    ),
    savedRoom: prepared.participants.map((_, i) =>
      free(i) ? layout[i] : undefined,
    ),
  };
}

/** Whether `next` beats `current` on U2–U6 of the original input. */
function isBetter(
  prepared: PreparedProposal,
  next: Layout,
  current: Layout,
): boolean {
  const vector = (layout: Layout): number[] => {
    const s = scoreLayout(prepared, layout);
    return [s.crossTerm, ...s.preferences, s.moves, s.extraBeds, s.rooms];
  };
  const a = vector(next);
  const b = vector(current);
  const k = a.findIndex((value, index) => value !== b[index]);
  return k >= 0 && a[k]! < b[k]!;
}

export type RoomProposalOptions = {
  /** Wall-clock limit for the term (spec: 30 s). */
  timeLimitMs?: number;
  strategy?: 'search' | 'exact';
  /** Local search budget in evaluated moves (deterministic). */
  budget?: number;
};

export async function solveRoomProposal(
  input: RoomProposalInput,
  {
    timeLimitMs = 30_000,
    strategy = 'search',
    budget,
  }: RoomProposalOptions = {},
): Promise<RoomProposalResult> {
  const started = Date.now();
  const deadline = started + timeLimitMs;
  const prepared = prepareProposal(input);
  let solves = 0;
  let complete = true;
  const stats = (): ProposalStats => ({
    millis: Date.now() - started,
    solves,
    complete,
  });

  let layout: Layout = prepared.participants.map((_, i) =>
    prepared.locked.get(i),
  );
  const solver = await loadHighs();
  try {
    if (strategy === 'exact') {
      const model = buildProposalModel(prepared);
      if (model.objectives.count.length > 0) {
        const runner = new HighsRunner(
          solver,
          (sense, objective, fixed) => toLp(model, sense, objective, fixed),
          model.constraints,
          deadline,
        );
        const outcome = solveExactLevels(runner, prepared, model);
        solves = runner.solves;
        complete = outcome.complete;
        layout = layoutOf(prepared, outcome.solution);
      }
    } else {
      const start = placeByPriority(prepared, solver, deadline);
      solves = start.solves;
      let search = searchLayout(prepared, start.layout, { budget, deadline });
      // Re-search as if the result were applied, while that still improves
      // the proposal: an applied proposal must be a fixed point (§7.1).
      for (let round = 0; round < MAX_ROUNDS && search.complete; round += 1) {
        const again = searchLayout(
          appliedAs(prepared, search.layout),
          search.layout,
          // Half a budget per round keeps the time margin (ADR-0002).
          { budget: Math.floor((budget ?? DEFAULT_BUDGET) / 2), deadline },
        );
        if (!isBetter(prepared, again.layout, search.layout)) break;
        search = again;
      }
      complete = search.complete;
      layout = search.layout;
    }
  } catch (error) {
    if (!(error instanceof TimeLimit)) throw error;
    complete = false;
    return { status: 'timeout', stats: stats() };
  }

  const rooms: Record<string, string> = {};
  prepared.participants.forEach((p, i) => {
    const r = layout[i];
    if (r !== undefined) rooms[p.id] = prepared.rooms[r]!.id;
  });
  return {
    status: 'solved',
    rooms,
    unplaced: unplacedReasons(prepared, layout),
    lockConflicts: prepared.lockConflicts,
    warnings: prepared.warnings,
    wishes: wishStates(prepared, layout),
    scores: scoreLayout(prepared, layout),
    stats: stats(),
  };
}
