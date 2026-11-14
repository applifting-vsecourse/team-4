import { Constraint, Expression, toLp } from './assignment-model';
import { Highs, HighsRunner } from './highs-runner';
import { capacity, Layout, PreparedProposal } from './room-proposal-layout';

// U1 of the room proposal on an aggregate model (ADR-0002). At this level
// people of one hard-attribute value are interchangeable, so a value with `a`
// places takes its `a` first people in person order; open rooms with the same
// beds and no lock are interchangeable too. The model only decides how many
// rooms of each size carry each value, which keeps U1 exact and fast where the
// room-level model needs a subset-sum search. The result is a valid starting
// layout for the local search, keeping saved rooms where it can.

type Group = { value: string | null; people: number[] };

export function placeByPriority(
  prepared: PreparedProposal,
  solver: Highs,
  deadline: number,
): { layout: Layout; solves: number } {
  const { participants, rooms, locked } = prepared;
  const layout: Layout = participants.map((_, i) => locked.get(i));
  const unlocked = participants.flatMap((_, i) =>
    locked.has(i) || prepared.allowed[i]!.length === 0 ? [] : [i],
  );
  if (unlocked.length === 0) return { layout, solves: 0 };

  const key = (i: number): string | null =>
    prepared.hasHardAttribute ? participants[i]!.value : null;
  const groups: Group[] = [];
  for (const i of unlocked) {
    const group = groups.find((g) => g.value === key(i));
    if (group) group.people.push(i);
    else groups.push({ value: key(i), people: [i] });
  }

  // Open rooms: a room with locked people keeps their value and its free beds;
  // the others are interchangeable within their number of beds.
  const open = [...new Set(unlocked.flatMap((i) => prepared.allowed[i]!))];
  const lockedIn = rooms.map(() => [] as number[]);
  for (const [i, r] of locked) lockedIn[r]!.push(i);
  const reserved = new Map<string | null, number>();
  const types = new Map<number, number[]>();
  for (const r of open) {
    const free = capacity(rooms[r]!) - lockedIn[r]!.length;
    if (lockedIn[r]!.length > 0) {
      const value = key(lockedIn[r]![0]!);
      reserved.set(value, (reserved.get(value) ?? 0) + free);
    } else {
      types.set(free, [...(types.get(free) ?? []), r]);
    }
  }
  const sizes = [...types.keys()];

  const n = (t: number, v: number): string => `n_${t}_${v}`;
  const a = (v: number): string => `a_${v}`;
  const constraints: Constraint[] = [];
  const integers: { name: string; upper: number }[] = [];
  groups.forEach((group, v) => {
    integers.push({ name: a(v), upper: group.people.length });
    sizes.forEach((size, t) =>
      integers.push({ name: n(t, v), upper: types.get(size)!.length }),
    );
    // Places of a value: its share of the free rooms and its locked rooms.
    constraints.push({
      expression: [
        [1, a(v)],
        ...sizes.map((size, t) => [-size, n(t, v)] as const),
      ],
      sense: '<=',
      rhs: reserved.get(group.value) ?? 0,
    });
  });
  sizes.forEach((size, t) =>
    constraints.push({
      expression: groups.map((_, v) => [1, n(t, v)] as const),
      sense: '<=',
      rhs: types.get(size)!.length,
    }),
  );
  const model = { constraints, binaries: [], integers };
  const runner = new HighsRunner(
    solver,
    (sense, objective, fixed) => toLp(model, sense, objective, fixed),
    constraints,
    deadline,
  );

  let solves = 0;
  // Most people placed, then the priority by person order (both exact).
  const fixed: Constraint[] = [];
  const total: Expression = groups.map((_, v) => [1, a(v)] as const);
  let stage = runner.solve('Maximize', total, fixed);
  fixed.push({ expression: total, sense: '=', rhs: stage.value });
  const decided = groups.map(() => false);
  const rank = groups.map(() => 0);
  for (const i of unlocked) {
    const v = groups.findIndex((g) => g.value === key(i));
    if (decided[v]) continue;
    rank[v]! += 1;
    let places = stage.solution[a(v)] ?? 0;
    if (places < rank[v]!) {
      const attempt = runner.solve('Maximize', [[1, a(v)]], fixed);
      if (attempt.value >= rank[v]!) {
        stage = attempt;
        places = attempt.solution[a(v)] ?? 0;
      }
    }
    if (places >= rank[v]!) {
      fixed.push({ expression: [[1, a(v)]], sense: '>=', rhs: rank[v]! });
    } else {
      // Its later people stay out as well: they are interchangeable with it.
      fixed.push({ expression: [[1, a(v)]], sense: '=', rhs: rank[v]! - 1 });
      decided[v] = true;
    }
  }

  // Which free room carries which value: an assignment, exact in HiGHS, with
  // beds for every placed person, that serves first the rooms placed people
  // had in other terms (U2), then their saved rooms (U4). Then the placed
  // people fill them: saved room, then a room of another term, then any.
  const placedOf = groups.map((group, v) =>
    group.people.slice(0, stage.solution[a(v)] ?? 0),
  );
  const valueOf = new Map<number, string | null>();
  for (const r of open)
    if (lockedIn[r]!.length > 0) valueOf.set(r, key(lockedIn[r]![0]!));
  const freeRooms = [...types.values()].flat();
  const weight = participants.length + 1;
  const y = (r: number, v: number): string => `y_${r}_${v}`;
  const rows: Constraint[] = [];
  const binaries: string[] = [];
  const claims: Expression = [];
  for (const r of freeRooms) {
    rows.push({
      expression: groups.map((_, v) => [1, y(r, v)] as const),
      sense: '<=',
      rhs: 1,
    });
    groups.forEach((_, v) => {
      binaries.push(y(r, v));
      const people = placedOf[v]!;
      const value =
        weight *
          people.filter((i) => prepared.crossTermRooms[i]!.includes(r)).length +
        people.filter((i) => prepared.savedRoom[i] === r).length;
      if (value > 0) claims.push([value, y(r, v)]);
    });
  }
  // Each value gets beds for its placed people; which rooms is free (U1
  // fixed only how many people of each value are placed).
  groups.forEach((group, v) =>
    rows.push({
      expression: freeRooms.map((r) => [capacity(rooms[r]!), y(r, v)] as const),
      sense: '>=',
      rhs: placedOf[v]!.length - (reserved.get(group.value) ?? 0),
    }),
  );
  if (freeRooms.length > 0) {
    const assignment = { constraints: rows, binaries, integers: [] };
    const assigner = new HighsRunner(
      solver,
      (sense, objective, fixed) => toLp(assignment, sense, objective, fixed),
      rows,
      deadline,
    );
    // Without this assignment there is no valid layout yet, so running out of
    // time here makes the proposal a timeout, like U1 itself (spec §7).
    const chosen = assigner.solve('Maximize', claims, []);
    solves += assigner.solves;
    for (const r of freeRooms)
      groups.forEach((group, v) => {
        if (chosen.solution[y(r, v)] === 1) valueOf.set(r, group.value);
      });
  }
  const free = rooms.map((room, r) => capacity(room) - lockedIn[r]!.length);
  groups.forEach((group, v) => {
    const placed = placedOf[v]!;
    const targets = open
      .filter((r) => valueOf.get(r) === group.value)
      .sort((x, y) => x - y);
    const take = (i: number, wanted: number[]): boolean => {
      const r = wanted.find(
        (room) => targets.includes(room) && free[room]! > 0,
      );
      if (r === undefined) return false;
      layout[i] = r;
      free[r]! -= 1;
      return true;
    };
    const notInSavedRoom = placed.filter((i) => {
      const room = prepared.savedRoom[i];
      return !(room !== undefined && take(i, [room]));
    });
    const rest = notInSavedRoom.filter(
      (i) => !take(i, prepared.crossTermRooms[i]!),
    );
    for (const i of rest) take(i, targets);
  });
  return { layout, solves: runner.solves + solves };
}
