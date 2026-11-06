import { Constraint, Expression } from './assignment-model';
import { HighsRunner, Solution } from './highs-runner';
import { Candidate, SolverInput, SolverRoom } from './solver.types';

// Phase 1 (who is suitable) in aggregate form. Without pinned rooms, rooms of
// the same beds are interchangeable, and so are candidates of the same value:
// a value with `a` places always takes its `a` highest positions. The model
// therefore only decides how many rooms of each type carry each value:
//   w_t_v  rooms of type t carrying value v (integer 0..rooms of type t)
//   a_v    accommodated candidates with value v (integer 0..candidates of v)
//   e_v    extra beds used by value v (integer ≥ 0)
// It has the same optimum as the room-level model, without its symmetry.

/** Without a hard attribute every participant shares this one value. */
export const ANY_VALUE = '*';

export type RoomType = {
  baseBeds: number;
  extraBeds: number;
  rooms: SolverRoom[];
};

export type PhaseOneModel = {
  types: RoomType[];
  values: string[];
  /** Candidates of each value, by position. */
  queues: Map<string, Candidate[]>;
  /** Confirmed participants of each value. */
  confirmed: Map<string, string[]>;
  constraints: Constraint[];
  /** Per value: the row fitting its confirmed and accommodated into its beds. */
  fitRows: Constraint[];
  integers: { name: string; upper: number }[];
  objectives: { count: Expression; extraBeds: Expression };
};

export const w = (type: number, value: number): string => `w_${type}_${value}`;
export const a = (value: number): string => `a_${value}`;
const e = (value: number): string => `e_${value}`;

const valueOf = (input: SolverInput, value: string | null): string =>
  input.hasHardAttribute ? (value ?? ANY_VALUE) : ANY_VALUE;

/** Candidates must already exclude those who need a manual determination. */
export function buildPhaseOneModel(input: SolverInput): PhaseOneModel {
  const types: RoomType[] = [];
  for (const room of input.rooms) {
    if (room.baseBeds + room.extraBeds === 0) continue;
    const type = types.find(
      (t) => t.baseBeds === room.baseBeds && t.extraBeds === room.extraBeds,
    );
    if (type) type.rooms.push(room);
    else
      types.push({
        baseBeds: room.baseBeds,
        extraBeds: room.extraBeds,
        rooms: [room],
      });
  }

  const queues = new Map<string, Candidate[]>();
  const confirmed = new Map<string, string[]>();
  for (const candidate of [...input.candidates].sort(
    (x, y) => x.position - y.position,
  )) {
    const value = valueOf(input, candidate.value);
    queues.set(value, [...(queues.get(value) ?? []), candidate]);
  }
  for (const participant of input.confirmed) {
    const value = valueOf(input, participant.value);
    confirmed.set(value, [...(confirmed.get(value) ?? []), participant.id]);
  }
  const values = [...new Set([...queues.keys(), ...confirmed.keys()])].sort();

  const constraints: Constraint[] = [];
  const fitRows: Constraint[] = [];
  const integers: { name: string; upper: number }[] = [];
  types.forEach((type, t) => {
    values.forEach((_, v) =>
      integers.push({ name: w(t, v), upper: type.rooms.length }),
    );
    // A room carries at most one value.
    constraints.push({
      expression: values.map((_, v) => [1, w(t, v)] as const),
      sense: '<=',
      rhs: type.rooms.length,
    });
  });
  values.forEach((value, v) => {
    const fixed = confirmed.get(value)?.length ?? 0;
    integers.push({ name: a(v), upper: queues.get(value)?.length ?? 0 });
    integers.push({
      name: e(v),
      upper: fixed + (queues.get(value)?.length ?? 0),
    });
    // The confirmed and the accommodated fit into the beds of the value's rooms.
    const fit: Constraint = {
      expression: [
        [1, a(v)],
        ...types.map(
          (type, t) => [-(type.baseBeds + type.extraBeds), w(t, v)] as const,
        ),
      ],
      sense: '<=',
      rhs: -fixed,
    };
    fitRows.push(fit);
    constraints.push(fit);
    // People beyond the base beds of the value's rooms sleep on extra beds.
    constraints.push({
      expression: [
        [1, a(v)],
        [-1, e(v)],
        ...types.map((type, t) => [-type.baseBeds, w(t, v)] as const),
      ],
      sense: '<=',
      rhs: -fixed,
    });
  });

  return {
    types,
    values,
    queues,
    confirmed,
    constraints,
    fitRows,
    integers,
    objectives: {
      count: values.map((_, v) => [1, a(v)] as const),
      extraBeds: values.map((_, v) => [1, e(v)] as const),
    },
  };
}

export function phaseOneToLp(
  model: PhaseOneModel,
  sense: 'Maximize' | 'Minimize',
  objective: Expression,
  extra: Constraint[] = [],
): string {
  const format = (expression: Expression): string =>
    expression.length === 0
      ? '0 a_none'
      : expression
          .map(
            ([c, name], i) =>
              `${c < 0 ? '-' : i === 0 ? '' : '+'} ${Math.abs(c)} ${name}`,
          )
          .join(' ');
  return [
    sense,
    ` obj: ${format(objective)}`,
    'Subject To',
    ...[...model.constraints, ...extra].map(
      (c, i) => ` c${i}: ${format(c.expression)} ${c.sense} ${c.rhs}`,
    ),
    'Bounds',
    ...model.integers.map(({ name, upper }) => ` 0 <= ${name} <= ${upper}`),
    ...(objective.length === 0 ? [' a_none = 0'] : []),
    'General',
    ...model.integers.map(({ name }) => ` ${name}`),
    'End',
  ].join('\n');
}

/** Who is suitable, and an internal room layout that shows it fits. */
export type Placement = {
  suitable: string[];
  rooms: Record<string, string>;
  roomValues: Record<string, string | null>;
  beds: { baseUsed: number; extraUsed: number; base: number; extra: number };
  /** False when a layout level ran out of time (see SolverStats). */
  complete: boolean;
};

/**
 * Levels 1–3 of the specification on the aggregate model. Level 2 walks the
 * order from the top: a candidate with rank j within their value is placed
 * when the optimal count still allows j places for that value. Most steps are
 * answered by the current solution; a value is closed after its first miss.
 */
export function solvePhaseOne(
  runner: HighsRunner,
  model: PhaseOneModel,
  candidates: Candidate[],
): Placement {
  const fixed: Constraint[] = [];
  const count = runner.solve('Maximize', model.objectives.count, fixed);
  fixed.push({
    expression: model.objectives.count,
    sense: '=',
    rhs: count.value,
  });

  let solution = count.solution;
  const indexOf = new Map(model.values.map((value, v) => [value, v]));
  const valueOfCandidate = new Map(
    [...model.queues].flatMap(([value, queue]) =>
      queue.map((c) => [c.id, value] as const),
    ),
  );
  const granted = new Map<string, number>();
  const closed = new Set<string>();
  for (const candidate of [...candidates].sort(
    (x, y) => x.position - y.position,
  )) {
    const value = valueOfCandidate.get(candidate.id)!;
    if (closed.has(value)) continue;
    const v = indexOf.get(value)!;
    const needed = (granted.get(value) ?? 0) + 1;
    if ((solution[a(v)] ?? 0) < needed) {
      const attempt = runner.solve('Maximize', [[1, a(v)]], fixed);
      if (attempt.value >= needed) solution = attempt.solution;
    }
    if ((solution[a(v)] ?? 0) >= needed) {
      granted.set(value, needed);
      fixed.push({ expression: [[1, a(v)]], sense: '>=', rhs: needed });
    } else {
      closed.add(value);
      fixed.push({ expression: [[1, a(v)]], sense: '<=', rhs: needed - 1 });
    }
  }

  let complete = true;
  const extra = runner.solve('Minimize', model.objectives.extraBeds, fixed, {
    acceptIncumbent: true,
  });
  if (extra) solution = extra.solution;
  if (!extra?.optimal) complete = false;

  return { ...layOut(model, solution, granted), complete };
}

/** Real rooms for the counts: each value takes its rooms, base beds first. */
function layOut(
  model: PhaseOneModel,
  solution: Solution,
  granted: Map<string, number>,
): Omit<Placement, 'complete'> {
  const rooms: Record<string, string> = {};
  const roomValues: Record<string, string | null> = {};
  const suitable: string[] = [];
  let baseUsed = 0;
  let extraUsed = 0;
  const free = model.types.map((type) => [...type.rooms]);

  model.values.forEach((value, v) => {
    const accommodated = (model.queues.get(value) ?? []).slice(
      0,
      granted.get(value) ?? 0,
    );
    suitable.push(...accommodated.map((c) => c.id));
    const people = [
      ...(model.confirmed.get(value) ?? []),
      ...accommodated.map((c) => c.id),
    ];
    const own = model.types.flatMap((_, t) =>
      free[t]!.splice(0, solution[w(t, v)] ?? 0),
    );
    // Base beds of every room first, then the extra beds.
    const beds = [
      ...own.flatMap((room) =>
        Array.from({ length: room.baseBeds }, () => [room, false] as const),
      ),
      ...own.flatMap((room) =>
        Array.from({ length: room.extraBeds }, () => [room, true] as const),
      ),
    ];
    people.forEach((id, index) => {
      const [room, isExtra] = beds[index]!;
      rooms[id] = room.id;
      roomValues[room.id] = value === ANY_VALUE ? null : value;
      if (isExtra) extraUsed += 1;
      else baseUsed += 1;
    });
  });

  const all = model.types.flatMap((type) => type.rooms);
  return {
    suitable,
    rooms,
    roomValues,
    beds: {
      baseUsed,
      extraUsed,
      base: all.reduce((sum, room) => sum + room.baseBeds, 0),
      extra: all.reduce((sum, room) => sum + room.extraBeds, 0),
    },
  };
}

/**
 * The confirmed no longer fit (spec §7.4): each value may leave confirmed out
 * at a cost, and the values that must are reported with all their confirmed.
 */
export function diagnosePhaseOne(
  runner: HighsRunner,
  input: SolverInput,
): string[] {
  const model = buildPhaseOneModel({ ...input, candidates: [] });
  const slack = model.values.map((_, v) => `s_${v}`);
  model.fitRows.forEach((row, v) => {
    row.expression = [...row.expression, [-1, slack[v]!]];
  });
  model.integers.push(
    ...slack.map((name) => ({ name, upper: input.confirmed.length })),
  );
  const elastic = new HighsRunner(
    runner.solver,
    (sense, objective, fixed) => phaseOneToLp(model, sense, objective, fixed),
    model.constraints,
    Date.now() + 5_000,
  );
  const { solution } = elastic.solve(
    'Minimize',
    slack.map((name) => [1, name] as const),
    [],
  );
  runner.solves += elastic.solves;
  return model.values.flatMap((value, v) =>
    (solution[slack[v]!] ?? 0) > 0 ? (model.confirmed.get(value) ?? []) : [],
  );
}
