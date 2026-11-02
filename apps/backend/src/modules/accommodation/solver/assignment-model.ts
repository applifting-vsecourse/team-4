import {
  Candidate,
  ConfirmedParticipant,
  SolverInput,
  SolverRoom,
} from './solver.types';

// The integer model of one term (spec v4 §7.2) written as CPLEX LP text for
// HiGHS. Variables:
//   x_i_r  participant i sleeps in room r (binary)
//   y_r_v  room r carries hard-attribute value v (binary)
//   e_r    extra beds used in room r (integer 0..extraBeds)
//   u_r    room r is used (binary)
//   z_r_k_w room r holds someone with value w of soft attribute k (binary)

export type Term = readonly [coefficient: number, variable: string];
export type Expression = Term[];
export type Constraint = {
  expression: Expression;
  sense: '<=' | '>=' | '=';
  rhs: number;
};

type Participant = {
  id: string;
  value: string | null;
  softValues: Record<string, string>;
  isConfirmed: boolean;
  /** Rooms the participant may sleep in. */
  roomIndexes: number[];
};

export type AssignmentModel = {
  rooms: SolverRoom[];
  /** Confirmed first, then the evaluated candidates by position. */
  participants: Participant[];
  /** Index of each evaluated candidate in `participants`, by position. */
  candidateIndexes: number[];
  hardValues: string[];
  constraints: Constraint[];
  binaries: string[];
  integers: { name: string; upper: number }[];
  objectives: {
    /** Accommodated candidates (stage 1, maximized). */
    count: Expression;
    /** Extra beds in use (stage 3, minimized). */
    extraBeds: Expression;
    /** Rooms in use (stage 4, minimized). */
    rooms: Expression;
    /** Weighted soft-rule violations (stage 5, minimized). */
    soft: Expression;
  };
};

export const x = (participant: number, room: number): string =>
  `x_${participant}_${room}`;
const y = (room: number, value: number): string => `y_${room}_${value}`;
const e = (room: number): string => `e_${room}`;
const u = (room: number): string => `u_${room}`;
const z = (room: number, attribute: number, value: number): string =>
  `z_${room}_${attribute}_${value}`;

/** Placement of participant `i`: the sum of its room variables. */
export const placement = (
  model: AssignmentModel,
  participant: number,
): Expression =>
  model.participants[participant]!.roomIndexes.map(
    (room) => [1, x(participant, room)] as const,
  );

const capacity = (room: SolverRoom): number => room.baseBeds + room.extraBeds;

const toParticipant = (
  source: ConfirmedParticipant | Candidate,
  isConfirmed: boolean,
  rooms: SolverRoom[],
): Participant => {
  const pinned =
    isConfirmed && 'roomId' in source && source.roomId
      ? rooms.findIndex((room) => room.id === source.roomId)
      : -1;
  return {
    id: source.id,
    value: source.value,
    softValues: source.softValues ?? {},
    isConfirmed,
    roomIndexes:
      pinned >= 0
        ? [pinned]
        : rooms.flatMap((room, index) => (capacity(room) > 0 ? [index] : [])),
  };
};

/**
 * Builds the model of one term. Candidates without an effective value under a
 * hard attribute must already be left out (they get reason R, not a place).
 * With `breakSymmetry`, rooms with the same beds are filled in order, which
 * leaves one of many equivalent solutions and speeds up the search.
 */
export function buildAssignmentModel(
  input: SolverInput,
  { breakSymmetry = true }: { breakSymmetry?: boolean } = {},
): AssignmentModel {
  const rooms = input.rooms;
  const candidates = [...input.candidates].sort(
    (a, b) => a.position - b.position,
  );
  const participants = [
    ...input.confirmed.map((p) => toParticipant(p, true, rooms)),
    ...candidates.map((p) => toParticipant(p, false, rooms)),
  ];
  const candidateIndexes = candidates.map(
    (_, index) => input.confirmed.length + index,
  );
  const hardValues = input.hasHardAttribute
    ? [
        ...new Set(
          participants.flatMap((p) => (p.value === null ? [] : [p.value])),
        ),
      ].sort()
    : [];
  const softAttributes = input.softAttributes ?? [];

  const constraints: Constraint[] = [];
  const binaries: string[] = [];
  const integers: { name: string; upper: number }[] = [];
  // Participants who may sleep in each room.
  const inRoom: number[][] = rooms.map(() => []);
  const occupancyOf = (r: number, who = inRoom[r]!): Expression =>
    who.map((i) => [1, x(i, r)] as const);

  participants.forEach((participant, i) => {
    const terms: Expression = participant.roomIndexes.map((r) => {
      binaries.push(x(i, r));
      inRoom[r]!.push(i);
      return [1, x(i, r)] as const;
    });
    // Everyone sleeps in at most one room; the confirmed always in one.
    constraints.push({
      expression: terms,
      sense: participant.isConfirmed ? '=' : '<=',
      rhs: 1,
    });
  });

  rooms.forEach((room, r) => {
    const beds = capacity(room);
    if (beds === 0) return;
    const occupancy = occupancyOf(r);
    binaries.push(u(r));
    // Occupancy within the term's beds, and only in a used room.
    constraints.push({
      expression: [...occupancy, [-beds, u(r)]],
      sense: '<=',
      rhs: 0,
    });
    // Beds beyond the base ones are extra beds.
    integers.push({ name: e(r), upper: room.extraBeds });
    constraints.push({
      expression: [...occupancy, [-1, e(r)]],
      sense: '<=',
      rhs: room.baseBeds,
    });

    // Homogeneity: one hard-attribute value per room.
    if (hardValues.length > 0) {
      hardValues.forEach((value, v) => {
        binaries.push(y(r, v));
        const holders = occupancyOf(
          r,
          inRoom[r]!.filter((i) => participants[i]!.value === value),
        );
        if (holders.length > 0) {
          constraints.push({
            expression: [...holders, [-beds, y(r, v)]],
            sense: '<=',
            rhs: 0,
          });
        }
      });
      constraints.push({
        expression: hardValues.map((_, v) => [1, y(r, v)] as const),
        sense: '<=',
        rhs: 1,
      });
    }
  });

  // Soft attributes: z marks each value present in a room.
  const soft: Expression = [];
  softAttributes.forEach((attribute, k) => {
    const weight = 2 ** (softAttributes.length - 1 - k);
    const values = [
      ...new Set(
        participants.flatMap((p) => {
          const value = p.softValues[attribute];
          return value === undefined ? [] : [value];
        }),
      ),
    ].sort();
    rooms.forEach((room, r) => {
      if (capacity(room) === 0 || values.length < 2) return;
      values.forEach((value, w) => {
        const holders = occupancyOf(
          r,
          inRoom[r]!.filter(
            (i) => participants[i]!.softValues[attribute] === value,
          ),
        );
        if (holders.length === 0) return;
        binaries.push(z(r, k, w));
        constraints.push({
          expression: [...holders, [-capacity(room), z(r, k, w)]],
          sense: '<=',
          rhs: 0,
        });
        soft.push([weight, z(r, k, w)]);
      });
      // Distinct values in a used room minus one is its number of violations.
      soft.push([-weight, u(r)]);
    });
  });

  if (breakSymmetry) {
    addSymmetryBreaking(
      rooms,
      participants,
      rooms.map((_, r) => occupancyOf(r)),
      constraints,
    );
  }

  return {
    rooms,
    participants,
    candidateIndexes,
    hardValues,
    constraints,
    binaries,
    integers,
    objectives: {
      count: candidateIndexes.flatMap((i) =>
        participants[i]!.roomIndexes.map((r) => [1, x(i, r)] as const),
      ),
      extraBeds: rooms.flatMap((room, r) =>
        capacity(room) > 0 ? [[1, e(r)] as const] : [],
      ),
      rooms: rooms.flatMap((room, r) =>
        capacity(room) > 0 ? [[1, u(r)] as const] : [],
      ),
      soft,
    },
  };
}

/** Rooms with the same beds and no pinned guest are filled in input order. */
function addSymmetryBreaking(
  rooms: SolverRoom[],
  participants: Participant[],
  inRoom: Expression[],
  constraints: Constraint[],
): void {
  const pinned = new Set(
    participants.flatMap((p) =>
      p.roomIndexes.length === 1 ? p.roomIndexes : [],
    ),
  );
  const groups = new Map<string, number[]>();
  rooms.forEach((room, r) => {
    if (capacity(room) === 0 || pinned.has(r)) return;
    const key = `${room.baseBeds}+${room.extraBeds}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  for (const group of groups.values()) {
    for (let index = 1; index < group.length; index += 1) {
      const previous = group[index - 1]!;
      const current = group[index]!;
      constraints.push({
        expression: [
          ...inRoom[previous]!,
          ...inRoom[current]!.map(([c, name]) => [-c, name] as const),
        ],
        sense: '>=',
        rhs: 0,
      });
    }
  }
}

const formatExpression = (expression: Expression): string => {
  if (expression.length === 0) return '0 x_none';
  // Short lines: the LP reader accepts continuation lines.
  const parts = expression.map(
    ([coefficient, name], index) =>
      `${coefficient < 0 ? '-' : index === 0 ? '' : '+'} ${Math.abs(coefficient)} ${name}`,
  );
  const lines: string[] = [];
  for (let index = 0; index < parts.length; index += 8) {
    lines.push(parts.slice(index, index + 8).join(' '));
  }
  return lines.join('\n   ');
};

/** The model with one objective and the constraints fixed by earlier stages. */
export function toLp(
  model: AssignmentModel,
  sense: 'Maximize' | 'Minimize',
  objective: Expression,
  extra: Constraint[] = [],
): string {
  const rows = [...model.constraints, ...extra].map(
    (constraint, index) =>
      ` c${index}: ${formatExpression(constraint.expression)} ${constraint.sense} ${constraint.rhs}`,
  );
  const usesPlaceholder = objective.length === 0;
  return [
    sense,
    ` obj: ${formatExpression(objective)}`,
    'Subject To',
    ...rows,
    'Bounds',
    ...model.integers.map(({ name, upper }) => ` 0 <= ${name} <= ${upper}`),
    ...(usesPlaceholder ? [' x_none = 0'] : []),
    'Binary',
    ...model.binaries.map((name) => ` ${name}`),
    'General',
    ...model.integers.map(({ name }) => ` ${name}`),
    'End',
  ].join('\n');
}
