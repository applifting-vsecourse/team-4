import {
  AssignmentModel,
  buildAssignmentModel,
  Constraint,
  Expression,
  placement,
  toLp,
  x,
} from './assignment-model';
import {
  HighsRunner,
  Infeasible,
  loadHighs,
  Solution,
  TimeLimit,
  valueOf,
} from './highs-runner';
import {
  buildPhaseOneModel,
  diagnosePhaseOne,
  phaseOneToLp,
  Placement,
  solvePhaseOne,
} from './phase-one';
import {
  Candidate,
  SolverInput,
  SolverResult,
  SolverStats,
  UnplacedReason,
} from './solver.types';

// Evaluation of one term (spec v4 §7.3, variant M), solved level by level.
// Each level optimizes one goal and fixes its optimum for the next ones:
//   1. most candidates accommodated
//   2. among those, the higher positions (exact, walked from the top)
//   3. base beds before extra beds
//   4. fewest rooms (phase 2)
//   5. fewest soft-rule violations, weighted by rank (phase 2)
// Levels 1–2 decide who is suitable and must finish in time. Levels 3–5 only
// shape the rooms: out of time, the best layout so far is kept.
//
// Phase 1 uses an aggregate model (phase-one.ts): without pinned rooms, rooms
// of the same beds and candidates of the same value are interchangeable. Phase
// 2 needs real rooms and uses the room-level model (assignment-model.ts).

export type SolveOptions = {
  /** Wall-clock limit for the whole term (spec: 30 s). */
  timeLimitMs?: number;
  /**
   * Phase 1 decides who is suitable (levels 1–3); its rooms are internal.
   * Phase 2 proposes real rooms (levels 1–5).
   */
  phase?: 1 | 2;
  /** Phase 2 only: fill rooms of the same beds in order. */
  breakSymmetry?: boolean;
  /**
   * Phase 2 only. `weighted` folds all levels into one objective with linear
   * position weights; kept to compare with the specified `staged` solve in
   * the benchmark. It does not guarantee the exact order of level 2.
   */
  strategy?: 'staged' | 'weighted';
};

export async function solveAssignment(
  input: SolverInput,
  {
    timeLimitMs = 30_000,
    phase = 1,
    breakSymmetry = false,
    strategy = 'staged',
  }: SolveOptions = {},
): Promise<SolverResult> {
  const started = Date.now();
  const deadline = started + timeLimitMs;
  let runner: HighsRunner | null = null;
  let complete = true;
  const stats = (): SolverStats => ({
    millis: Date.now() - started,
    solves: runner?.solves ?? 0,
    complete,
  });

  // Without an effective value under a hard attribute nobody is evaluated (R).
  const needsManual = input.hasHardAttribute
    ? input.candidates.filter((c) => c.value === null)
    : [];
  const evaluated = input.candidates.filter((c) => !needsManual.includes(c));
  const totalBeds = input.rooms.reduce(
    (sum, room) => sum + room.baseBeds + room.extraBeds,
    0,
  );
  const solver = await loadHighs();

  try {
    let placement: Placement;
    if (phase === 1) {
      const model = buildPhaseOneModel({ ...input, candidates: evaluated });
      runner = new HighsRunner(
        solver,
        (sense, objective, fixed) =>
          phaseOneToLp(model, sense, objective, fixed),
        model.constraints,
        deadline,
      );
      placement = solvePhaseOne(runner, model, evaluated);
    } else {
      const model = buildAssignmentModel(
        { ...input, candidates: evaluated },
        { breakSymmetry },
      );
      runner = new HighsRunner(
        solver,
        (sense, objective, fixed) => toLp(model, sense, objective, fixed),
        model.constraints,
        deadline,
      );
      const outcome =
        strategy === 'staged'
          ? solveRoomLevel(runner, model)
          : solveWeighted(runner, model);
      placement = {
        ...describeRooms(model, outcome.solution),
        complete: outcome.complete,
      };
    }
    complete = placement.complete;
    const positionOf = new Map(evaluated.map((c) => [c.id, c.position]));
    return {
      status: 'solved',
      suitable: [...placement.suitable].sort(
        (p, q) => positionOf.get(p)! - positionOf.get(q)!,
      ),
      unplaced: [
        ...needsManual.map((c) => ({ id: c.id, reason: 'R' as const })),
        ...explainUnplaced(input, evaluated, placement, totalBeds),
      ],
      rooms: placement.rooms,
      roomValues: placement.roomValues,
      beds: placement.beds,
      stats: stats(),
    };
  } catch (error) {
    if (error instanceof TimeLimit) {
      complete = false;
      return { status: 'timeout', stats: stats() };
    }
    if (error instanceof Infeasible && runner) {
      return {
        status: 'infeasible',
        conflicting:
          phase === 1
            ? diagnosePhaseOne(runner, input)
            : diagnoseRoomLevel(runner, input),
        constraint:
          input.confirmed.length > totalBeds ? 'capacity' : 'homogeneity',
        stats: stats(),
      };
    }
    throw error;
  }
}

/** Reasons of spec §7.5 for evaluated candidates without a place. */
function explainUnplaced(
  input: SolverInput,
  evaluated: Candidate[],
  placement: Placement,
  totalBeds: number,
): { id: string; reason: UnplacedReason }[] {
  const placedPeople = input.confirmed.length + placement.suitable.length;
  const freeBeds = totalBeds - placedPeople;
  const suitable = new Set(placement.suitable);
  const lowestPlaced = Math.max(
    -1,
    ...evaluated.filter((c) => suitable.has(c.id)).map((c) => c.position),
  );
  const reasonFor = (candidate: Candidate): UnplacedReason => {
    if (totalBeds === 0) return 'N';
    // Free beds left, yet no place: they are in rooms carrying another value.
    if (freeBeds > 0) return 'B';
    // Full: by confirmed and higher positions only, or by lower positions
    // because taking this candidate would have lowered the count.
    return candidate.position < lowestPlaced ? 'C' : 'A';
  };
  return [...evaluated]
    .sort((p, q) => p.position - q.position)
    .filter((c) => !suitable.has(c.id))
    .map((c) => ({ id: c.id, reason: reasonFor(c) }));
}

/** Levels 1–5 on real rooms (phase 2). */
function solveRoomLevel(
  runner: HighsRunner,
  model: AssignmentModel,
): { solution: Solution; complete: boolean } {
  const fixed: Constraint[] = [];
  const { objectives } = model;

  const count = runner.solve('Maximize', objectives.count, fixed);
  fixed.push({ expression: objectives.count, sense: '=', rhs: count.value });

  let solution = preferPositions(
    runner,
    model,
    fixed,
    count.solution,
    count.value,
  );

  for (const objective of [
    objectives.extraBeds,
    objectives.rooms,
    objectives.soft,
  ]) {
    if (objective.length === 0) continue;
    const stage = runner.solve('Minimize', objective, fixed, {
      acceptIncumbent: true,
    });
    // Out of time: keep the best valid layout, at least the last level's.
    if (!stage) return { solution, complete: false };
    solution = stage.solution;
    if (!stage.optimal) return { solution, complete: false };
    fixed.push({ expression: objective, sense: '=', rhs: stage.value });
  }
  return { solution, complete: true };
}

/**
 * Level 2 on real rooms: walking the order from the top, each candidate is
 * fixed as accommodated when that still allows the optimal count. Weights
 * 2^(n−position) would express the order in one objective, but for 200
 * candidates they exceed what a floating-point solver can tell apart.
 */
function preferPositions(
  runner: HighsRunner,
  model: AssignmentModel,
  fixed: Constraint[],
  initial: Solution,
  optimalCount: number,
): Solution {
  let solution = initial;
  let accommodated = 0;
  for (const i of model.candidateIndexes) {
    const expression = placement(model, i);
    if (accommodated === optimalCount) {
      fixed.push({ expression, sense: '=', rhs: 0 });
      continue;
    }
    if (valueOf(expression, solution) !== 1) {
      const attempt = runner.solve('Maximize', expression, fixed);
      if (attempt.value === 1) solution = attempt.solution;
    }
    const placed = valueOf(expression, solution) === 1;
    fixed.push({ expression, sense: '=', rhs: placed ? 1 : 0 });
    if (placed) accommodated += 1;
  }
  return solution;
}

/** Comparison only: every level in one objective (see `SolveOptions`). */
function solveWeighted(
  runner: HighsRunner,
  model: AssignmentModel,
): { solution: Solution; complete: boolean } {
  const n = model.candidateIndexes.length;
  const { objectives } = model;
  const softMax =
    objectives.soft.reduce((sum, [c]) => sum + Math.max(c, 0), 0) + 1;
  const roomsMax = objectives.rooms.length + 1;
  const extraMax =
    model.rooms.reduce((sum, room) => sum + room.extraBeds, 0) + 1;
  const priorityMax = (n * (n + 1)) / 2 + 1;
  const wRooms = softMax;
  const wExtra = wRooms * roomsMax;
  const wPriority = wExtra * extraMax;
  const wCount = wPriority * priorityMax;
  const objective: Expression = [
    ...objectives.count.map(([c, name]) => [c * wCount, name] as const),
    ...model.candidateIndexes.flatMap((i, position) =>
      placement(model, i).map(
        ([c, name]) => [c * wPriority * (n - position), name] as const,
      ),
    ),
    ...objectives.extraBeds.map(([c, name]) => [-c * wExtra, name] as const),
    ...objectives.rooms.map(([c, name]) => [-c * wRooms, name] as const),
    ...objectives.soft.map(([c, name]) => [-c, name] as const),
  ];
  const stage = runner.solve('Maximize', objective, [], {
    acceptIncumbent: true,
  });
  if (!stage) throw new TimeLimit();
  return { solution: stage.solution, complete: stage.optimal };
}

function describeRooms(
  model: AssignmentModel,
  solution: Solution,
): Omit<Placement, 'complete'> {
  const rooms: Record<string, string> = {};
  const occupancy = model.rooms.map(() => 0);
  const roomValues: Record<string, string | null> = {};
  model.participants.forEach((participant, i) => {
    for (const r of participant.roomIndexes) {
      if (solution[x(i, r)] !== 1) continue;
      rooms[participant.id] = model.rooms[r]!.id;
      occupancy[r]! += 1;
      roomValues[model.rooms[r]!.id] ??= participant.value;
    }
  });
  const extraUsed = model.rooms.reduce(
    (sum, room, r) => sum + Math.max(occupancy[r]! - room.baseBeds, 0),
    0,
  );
  const placed = occupancy.reduce((sum, n) => sum + n, 0);
  return {
    suitable: model.candidateIndexes
      .map((i) => model.participants[i]!.id)
      .filter((id) => id in rooms),
    rooms,
    roomValues,
    beds: {
      baseUsed: placed - extraUsed,
      extraUsed,
      base: model.rooms.reduce((sum, room) => sum + room.baseBeds, 0),
      extra: model.rooms.reduce((sum, room) => sum + room.extraBeds, 0),
    },
  };
}

/**
 * Phase 2 counterpart of the phase 1 diagnosis (spec §7.4): each confirmed
 * participant may stay out at a cost, and the fewest who must are reported.
 */
function diagnoseRoomLevel(runner: HighsRunner, input: SolverInput): string[] {
  const elastic = buildAssignmentModel({ ...input, candidates: [] });
  const slack = elastic.participants.map((_, i) => `s_${i}`);
  // The first rows are the participants' own "one room" rows.
  elastic.constraints.forEach((constraint, index) => {
    if (index < elastic.participants.length && constraint.sense === '=') {
      constraint.expression = [...constraint.expression, [1, slack[index]!]];
    }
  });
  elastic.binaries.push(...slack);
  const elasticRunner = new HighsRunner(
    runner.solver,
    (sense, objective, fixed) => toLp(elastic, sense, objective, fixed),
    elastic.constraints,
    Date.now() + 5_000,
  );
  const { solution } = elasticRunner.solve(
    'Minimize',
    slack.map((name) => [1, name] as const),
    [],
  );
  runner.solves += elasticRunner.solves;
  return elastic.participants
    .filter((_, i) => solution[slack[i]!] === 1)
    .map((p) => p.id);
}
