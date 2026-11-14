import { Constraint, Expression, LpModel } from './assignment-model';
import { capacity, PreparedProposal } from './room-proposal-layout';

// The integer model of a room proposal (§4, §5) as LP rows for HiGHS.
// Variables:
//   x_i_r   participant i sleeps in room r (binary)
//   u_r     room r is used (binary)
//   e_r     extra beds used in room r (integer)
//   y_r_v   open room r carries hard-attribute value v (binary)
//   t_p_r   both people of wish pair p sleep in room r (binary)
//   z_r_k_w room r holds someone with value w of preference k (binary)
//   v_r_k   violations of preference k in room r (integer)

export const x = (i: number, r: number): string => `x_${i}_${r}`;
const u = (r: number): string => `u_${r}`;
const e = (r: number): string => `e_${r}`;
const y = (r: number, v: number): string => `y_${r}_${v}`;
const t = (pair: number, r: number): string => `t_${pair}_${r}`;
const z = (r: number, k: number, w: number): string => `z_${r}_${k}_${w}`;
const v = (r: number, k: number): string => `v_${r}_${k}`;

export type ProposalModel = LpModel & {
  /** Unlocked participants, in person order. */
  unlocked: number[];
  objectives: {
    /** U1: placed unlocked participants (maximized). */
    count: Expression;
    /** U2: placed people outside their other terms' rooms (minimized). */
    crossTerm: Expression;
    /** U3: one expression per preference, minimized (wishes: −met). */
    preferences: Expression[];
    /** U4: −(unlocked people kept in their saved room), minimized. */
    moves: Expression;
    /** U5, U6 (minimized). */
    extraBeds: Expression;
    rooms: Expression;
  };
};

/** Room variables of participant `i`: its placement. */
export const placementOf = (
  prepared: PreparedProposal,
  i: number,
): Expression => prepared.allowed[i]!.map((r) => [1, x(i, r)] as const);

export function buildProposalModel(prepared: PreparedProposal): ProposalModel {
  const { participants, rooms, allowed, locked, closed } = prepared;
  const constraints: Constraint[] = [];
  const binaries: string[] = [];
  const integers: { name: string; upper: number }[] = [];
  const inRoom: number[][] = rooms.map(() => []);
  const occupancy = (r: number, who = inRoom[r]!): Expression =>
    who.map((i) => [1, x(i, r)] as const);

  participants.forEach((_, i) => {
    for (const r of allowed[i]!) {
      binaries.push(x(i, r));
      inRoom[r]!.push(i);
    }
    // Locked people stay in their room (O4); others take at most one (O2).
    if (allowed[i]!.length > 0)
      constraints.push({
        expression: placementOf(prepared, i),
        sense: locked.has(i) ? '=' : '<=',
        rhs: 1,
      });
  });

  const used: Expression = [];
  const extraBeds: Expression = [];
  rooms.forEach((room, r) => {
    const who = inRoom[r]!;
    if (who.length === 0) return;
    const isClosed = closed.has(r);
    // A closed room holds only its locked people, even over its beds (O5).
    const beds = isClosed ? who.length : capacity(room);
    binaries.push(u(r));
    used.push([1, u(r)]);
    constraints.push({
      expression: [...occupancy(r), [-beds, u(r)]],
      sense: '<=',
      rhs: 0,
    });
    integers.push({
      name: e(r),
      upper: Math.max(room.extraBeds, who.length - room.baseBeds, 0),
    });
    extraBeds.push([1, e(r)]);
    constraints.push({
      expression: [...occupancy(r), [-1, e(r)]],
      sense: '<=',
      rhs: room.baseBeds,
    });

    // Homogeneity of the hard attribute in open rooms (O3).
    if (!prepared.hasHardAttribute || isClosed) return;
    const values = [...new Set(who.map((i) => participants[i]!.value))];
    if (values.length < 2) return;
    values.forEach((value, index) => {
      binaries.push(y(r, index));
      constraints.push({
        expression: [
          ...occupancy(
            r,
            who.filter((i) => participants[i]!.value === value),
          ),
          [-beds, y(r, index)],
        ],
        sense: '<=',
        rhs: 0,
      });
    });
    constraints.push({
      expression: values.map((_, index) => [1, y(r, index)] as const),
      sense: '<=',
      rhs: 1,
    });
  });

  const unlocked = participants.flatMap((_, i) => (locked.has(i) ? [] : [i]));

  return {
    constraints,
    binaries,
    integers,
    unlocked,
    objectives: {
      count: unlocked.flatMap((i) => placementOf(prepared, i)),
      crossTerm: participants.flatMap((_, i) => {
        const own = prepared.crossTermRooms[i]!;
        if (own.length === 0) return [];
        return allowed[i]!.filter((r) => !own.includes(r)).map(
          (r) => [1, x(i, r)] as const,
        );
      }),
      preferences: prepared.preferences.map((preference, k) =>
        preference.kind === 'wishes'
          ? wishObjective(prepared, inRoom, constraints, binaries)
          : attributeObjective(
              prepared,
              k,
              preference.id,
              preference.neutralValues,
              inRoom,
              constraints,
              binaries,
              integers,
            ),
      ),
      moves: unlocked.flatMap((i) => {
        const saved = prepared.savedRoom[i];
        return saved !== undefined && allowed[i]!.includes(saved)
          ? [[-1, x(i, saved)] as const]
          : [];
      }),
      extraBeds,
      rooms: used,
    },
  };
}

/** −(met wishes): t_p_r may be 1 only when both people sleep in room r. */
function wishObjective(
  prepared: PreparedProposal,
  inRoom: number[][],
  constraints: Constraint[],
  binaries: string[],
): Expression {
  const index = new Map(prepared.participants.map((p, i) => [p.id, i]));
  // A mutual wish is two wishes met by one shared room.
  const pairs = new Map<string, { a: number; b: number; wishes: number }>();
  for (const wish of prepared.wishes) {
    const a = index.get(wish.from);
    const b = index.get(wish.to);
    if (a === undefined || b === undefined) continue;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const pair = pairs.get(key) ?? { a, b, wishes: 0 };
    pair.wishes += 1;
    pairs.set(key, pair);
  }
  const objective: Expression = [];
  [...pairs.values()].forEach(({ a, b, wishes }, p) => {
    for (const r of prepared.allowed[a]!) {
      if (!inRoom[r]!.includes(b)) continue;
      binaries.push(t(p, r));
      constraints.push(
        {
          expression: [
            [1, t(p, r)],
            [-1, x(a, r)],
          ],
          sense: '<=',
          rhs: 0,
        },
        {
          expression: [
            [1, t(p, r)],
            [-1, x(b, r)],
          ],
          sense: '<=',
          rhs: 0,
        },
      );
      objective.push([-wishes, t(p, r)]);
    }
  });
  return objective;
}

/** Σ max(0, distinct non-neutral values − 1) over rooms (§5.4). */
function attributeObjective(
  prepared: PreparedProposal,
  k: number,
  attribute: string,
  neutral: string[],
  inRoom: number[][],
  constraints: Constraint[],
  binaries: string[],
  integers: { name: string; upper: number }[],
): Expression {
  const valueOf = (i: number): string | null => {
    const value = prepared.participants[i]!.softValues[attribute];
    return value === undefined || value === null || neutral.includes(value)
      ? null
      : value;
  };
  const objective: Expression = [];
  inRoom.forEach((who, r) => {
    const values = [
      ...new Set(
        who.flatMap((i) => (valueOf(i) === null ? [] : [valueOf(i)!])),
      ),
    ].sort();
    if (values.length < 2) return;
    values.forEach((value, w) => {
      const holders = who.filter((i) => valueOf(i) === value);
      binaries.push(z(r, k, w));
      constraints.push({
        expression: [
          ...holders.map((i) => [1, x(i, r)] as const),
          [-holders.length, z(r, k, w)],
        ],
        sense: '<=',
        rhs: 0,
      });
    });
    integers.push({ name: v(r, k), upper: values.length - 1 });
    constraints.push({
      expression: [
        ...values.map((_, w) => [1, z(r, k, w)] as const),
        [-1, v(r, k)],
      ],
      sense: '<=',
      rhs: 1,
    });
    objective.push([1, v(r, k)]);
  });
  return objective;
}
