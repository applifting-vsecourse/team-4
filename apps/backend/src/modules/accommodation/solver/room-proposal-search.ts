import { capacity, Layout, PreparedProposal } from './room-proposal-layout';

// Deterministic local search for levels U2–U7 of the room proposal
// (ADR-0002). It starts from a valid layout in which U1 is already decided
// and never changes who is placed. Layouts are compared by the score vector
// [U2, U3 items…, U4, U5, U6], lower is better, and finally by the U7 order.
// The budget counts evaluated moves, so the same input gives the same layout;
// the deadline is only a safety net.

export type SearchOptions = {
  /** Evaluated moves before the search stops (deterministic budget). */
  budget?: number;
  /** Perturbation rounds without improvement before the search stops. */
  patience?: number;
  /** Wall-clock safety net, epoch ms. */
  deadline?: number;
  seed?: number;
};

export type SearchResult = { layout: Layout; complete: boolean };

type Move = [person: number, room: number][];

export const DEFAULT_BUDGET = 2_000_000;

export function searchLayout(
  prepared: PreparedProposal,
  start: Layout,
  {
    budget = DEFAULT_BUDGET,
    patience = 50,
    deadline = Infinity,
    seed = 365,
  }: SearchOptions = {},
): SearchResult {
  const state = new SearchState(prepared, start);
  const random = generator(seed);
  let evaluations = 0;
  let outOfTime = false;
  // A quarter of the budget is kept for the ties (U7).
  let limit = Math.floor(budget * 0.75);
  const spend = (): boolean => {
    evaluations += 1;
    if (evaluations % 1024 === 1 && Date.now() > deadline) outOfTime = true;
    return evaluations < limit && !outOfTime;
  };

  state.descend(spend);
  let best = state.snapshot();
  let bestScore = state.total();
  // Iterated local search: perturb the best layout, descend, keep the better.
  let idle = 0;
  while (evaluations < limit && !outOfTime && idle < patience) {
    state.restore(best);
    if (!state.perturb(random)) break;
    const before = evaluations;
    state.descend(spend);
    // No move to evaluate: the layout cannot change, so stop.
    if (evaluations === before) break;
    const score = state.total();
    if (compare(score, bestScore) < 0) {
      best = state.snapshot();
      bestScore = score;
      idle = 0;
    } else idle += 1;
  }
  state.restore(best);
  limit = budget;
  // Running out of budget is deterministic and expected; only the deadline
  // makes a proposal incomplete (spec §7).
  state.breakTies(spend);
  return { layout: state.snapshot(), complete: !outOfTime };
}

/** Lexicographic comparison of score vectors, lower first. */
function compare(a: number[], b: number[]): number {
  for (let k = 0; k < a.length; k += 1) {
    if (a[k] !== b[k]) return a[k]! - b[k]!;
  }
  return 0;
}

/**
 * U7 order of two layouts: by each person's room in person order; no room
 * sorts after every room.
 */
function compareOrder(a: Layout, b: Layout): number {
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? Infinity;
    const y = b[i] ?? Infinity;
    if (x !== y) return x - y;
  }
  return 0;
}

/** Deterministic pseudo-random numbers in [0, 1). */
function generator(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  };
}

type Pair = { a: number; b: number; wishes: number };

class SearchState {
  private readonly room: Layout;
  private readonly occupancy: number[];
  /** Hard-attribute values in each room, with counts. */
  private readonly hard: Map<string | null, number>[];
  /** Per preference k (attributes only), counts of counted values per room. */
  private readonly soft: (Map<string, number>[] | null)[];
  private readonly softValue: (string | null)[][];
  private readonly pairs: Pair[];
  private readonly pairsOf: number[][];
  private readonly allowed: Set<number>[];
  /** Placed unlocked participants, in person order: those the search moves. */
  private readonly movable: number[];
  private readonly levels: number;
  private readonly wishLevel: number;
  private readonly zero: number[];

  constructor(
    private readonly prepared: PreparedProposal,
    start: Layout,
  ) {
    const { participants, rooms, preferences } = prepared;
    this.room = [...start];
    this.occupancy = rooms.map(() => 0);
    this.hard = rooms.map(() => new Map());
    this.softValue = preferences.map((preference) =>
      participants.map((p) => {
        if (preference.kind !== 'attribute') return null;
        const value = p.softValues[preference.id];
        return value === undefined ||
          value === null ||
          preference.neutralValues.includes(value)
          ? null
          : value;
      }),
    );
    this.soft = preferences.map((preference) =>
      preference.kind === 'attribute' ? rooms.map(() => new Map()) : null,
    );
    this.allowed = prepared.allowed.map((rooms) => new Set(rooms));
    this.movable = participants.flatMap((_, i) =>
      !prepared.locked.has(i) && start[i] !== undefined ? [i] : [],
    );
    this.levels = 1 + preferences.length + 3;
    this.zero = new Array<number>(this.levels).fill(0);
    this.wishLevel = 1 + preferences.findIndex((p) => p.kind === 'wishes');

    const index = new Map(participants.map((p, i) => [p.id, i]));
    const byKey = new Map<string, Pair>();
    for (const wish of prepared.wishes) {
      const a = index.get(wish.from);
      const b = index.get(wish.to);
      if (a === undefined || b === undefined) continue;
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const pair = byKey.get(key) ?? { a, b, wishes: 0 };
      pair.wishes += 1;
      byKey.set(key, pair);
    }
    this.pairs = [...byKey.values()];
    this.pairsOf = participants.map(() => []);
    this.pairs.forEach((pair, p) => {
      this.pairsOf[pair.a]!.push(p);
      this.pairsOf[pair.b]!.push(p);
    });
    participants.forEach((_, i) => {
      const r = this.room[i];
      if (r !== undefined) this.enter(i, r);
    });
  }

  snapshot(): Layout {
    return [...this.room];
  }

  restore(layout: Layout): void {
    this.apply(
      this.movable.flatMap((i) =>
        layout[i] !== this.room[i] ? [[i, layout[i]!] as const] : [],
      ) as Move,
    );
  }

  /** The score vector [U2, U3…, U4, U5, U6] of the current layout. */
  total(): number[] {
    const score = new Array<number>(this.levels).fill(0);
    this.prepared.participants.forEach((_, i) => this.addPerson(score, i, 1));
    this.prepared.rooms.forEach((_, r) => this.addRoom(score, r, 1));
    this.pairs.forEach((_, p) => this.addPair(score, p, 1));
    return score;
  }

  /** First-improvement descent over relocations, swaps and room swaps. */
  descend(spend: () => boolean): void {
    let improved = true;
    while (improved) {
      improved = false;
      for (const move of this.moves()) {
        if (!spend()) return;
        if (this.tryMove(move, (delta) => compare(delta, this.zero) < 0)) {
          improved = true;
        }
      }
    }
  }

  /** A few random valid moves, whatever their score. */
  perturb(random: () => number): boolean {
    const { movable } = this;
    if (movable.length < 2) return false;
    const steps = Math.max(2, Math.round(movable.length * 0.05));
    let done = 0;
    for (let attempt = 0; attempt < steps * 20 && done < steps; attempt += 1) {
      const i = movable[Math.floor(random() * movable.length)]!;
      const j = movable[Math.floor(random() * movable.length)]!;
      const rooms = [...this.allowed[i]!];
      const target = rooms[Math.floor(random() * rooms.length)]!;
      const kind = random();
      let move: Move;
      if (kind < 1 / 3) {
        // Relocate i.
        if (target === this.room[i]) continue;
        move = [[i, target]];
      } else if (kind < 2 / 3) {
        // Swap i and j.
        if (this.room[j] === this.room[i]) continue;
        move = [
          [i, this.room[j]!],
          [j, this.room[i]!],
        ];
      } else {
        // Swap the contents of i's room and the target room.
        const from = this.room[i]!;
        if (target === from) continue;
        move = movable.flatMap((k): Move =>
          this.room[k] === from
            ? [[k, target]]
            : this.room[k] === target
              ? [[k, from]]
              : [],
        );
      }
      if (this.tryMove(move, () => true)) done += 1;
    }
    return done > 0;
  }

  /**
   * U7: moves that keep U2–U6 and give an earlier person an earlier room.
   * Returns false when the budget ran out first.
   */
  breakTies(spend: () => boolean): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (const i of this.movable) {
        const current = this.room[i]!;
        for (let r = 0; r < current && !changed; r += 1) {
          if (!this.allowed[i]!.has(r)) continue;
          // Move i alone, swap i with someone in r, or swap both rooms.
          const candidates: Move[] = [
            [[i, r]],
            ...this.movable
              .filter((j) => this.room[j] === r)
              .map((j): Move => [
                [i, r],
                [j, current],
              ]),
            this.movable.flatMap((j): Move =>
              this.room[j] === r
                ? [[j, current]]
                : this.room[j] === current
                  ? [[j, r]]
                  : [],
            ),
          ];
          for (const move of candidates) {
            if (!spend()) return false;
            const before = this.snapshot();
            const earlier = (delta: number[]): boolean =>
              compare(delta, this.zero) === 0 &&
              compareOrder(this.room, before) < 0;
            if (this.tryMove(move, earlier)) {
              changed = true;
              break;
            }
          }
        }
      }
    }
    return true;
  }

  /** Every relocation, swap and room-content swap, in a fixed order. */
  private *moves(): Generator<Move> {
    const { movable, room } = this;
    for (const i of movable) {
      for (const r of this.allowed[i]!) {
        if (r !== room[i]) yield [[i, r]];
      }
    }
    for (let x = 0; x < movable.length; x += 1) {
      for (let y = x + 1; y < movable.length; y += 1) {
        const i = movable[x]!;
        const j = movable[y]!;
        if (room[i] !== room[j])
          yield [
            [i, room[j]!],
            [j, room[i]!],
          ];
      }
    }
    // Swapping whole rooms helps the room-level goals (U2, U4, U6).
    const rooms = this.prepared.rooms.length;
    for (let r = 0; r < rooms; r += 1) {
      for (let s = r + 1; s < rooms; s += 1) {
        const move: Move = [];
        for (const i of movable) {
          if (room[i] === r) move.push([i, s]);
          else if (room[i] === s) move.push([i, r]);
        }
        if (move.length > 0) yield move;
      }
    }
    // Bring both people of an unmet wish into one room, sending up to two of
    // its occupants to the rooms they leave.
    const movableSet = new Set(movable);
    for (const { a, b } of this.pairs) {
      if (!movableSet.has(a) || !movableSet.has(b)) continue;
      if (room[a] === room[b]) continue;
      for (let r = 0; r < rooms; r += 1) {
        if (r === room[a] || r === room[b]) continue;
        if (!this.allowed[a]!.has(r) || !this.allowed[b]!.has(r)) continue;
        const inside = movable.filter((i) => room[i] === r);
        yield [
          [a, r],
          [b, r],
        ];
        for (const c of inside) {
          yield [
            [a, r],
            [b, r],
            [c, room[a]!],
          ];
          for (const d of inside) {
            if (d <= c) continue;
            yield [
              [a, r],
              [b, r],
              [c, room[a]!],
              [d, room[b]!],
            ];
          }
        }
      }
    }
  }

  /** Applies a valid move when `accept(delta)` holds; otherwise undoes it. */
  private tryMove(move: Move, accept: (delta: number[]) => boolean): boolean {
    if (move.some(([i, r]) => !this.allowed[i]!.has(r))) return false;
    const previous: Move = move.map(([i]) => [i, this.room[i]!]);
    const rooms = new Set<number>();
    for (const [i, r] of move) rooms.add(r).add(this.room[i]!);
    const people = move.map(([i]) => i);
    const pairs = new Set(people.flatMap((i) => this.pairsOf[i]!));

    const delta = new Array<number>(this.levels).fill(0);
    this.measure(delta, rooms, people, pairs, -1);
    this.apply(move);
    if (!this.isValid(rooms)) {
      this.apply(previous);
      return false;
    }
    this.measure(delta, rooms, people, pairs, 1);
    if (accept(delta)) return true;
    this.apply(previous);
    return false;
  }

  private measure(
    score: number[],
    rooms: Set<number>,
    people: number[],
    pairs: Set<number>,
    sign: number,
  ): void {
    for (const r of rooms) this.addRoom(score, r, sign);
    for (const i of people) this.addPerson(score, i, sign);
    for (const p of pairs) this.addPair(score, p, sign);
  }

  private isValid(rooms: Set<number>): boolean {
    for (const r of rooms) {
      if (this.prepared.closed.has(r)) continue;
      if (this.occupancy[r]! > capacity(this.prepared.rooms[r]!)) return false;
      if (this.prepared.hasHardAttribute && this.hard[r]!.size > 1)
        return false;
    }
    return true;
  }

  private apply(move: Move): void {
    for (const [i] of move) this.leave(i, this.room[i]!);
    for (const [i, r] of move) this.enter(i, r);
  }

  private enter(i: number, r: number): void {
    this.room[i] = r;
    this.occupancy[r]! += 1;
    count(this.hard[r]!, this.prepared.participants[i]!.value, 1);
    this.soft.forEach((rooms, k) => {
      const value = this.softValue[k]![i]!;
      if (rooms && value !== null) count(rooms[r]!, value, 1);
    });
  }

  private leave(i: number, r: number): void {
    this.occupancy[r]! -= 1;
    count(this.hard[r]!, this.prepared.participants[i]!.value, -1);
    this.soft.forEach((rooms, k) => {
      const value = this.softValue[k]![i]!;
      if (rooms && value !== null) count(rooms[r]!, value, -1);
    });
  }

  /** U3 attribute items, U5 and U6 of room r. */
  private addRoom(score: number[], r: number, sign: number): void {
    this.soft.forEach((rooms, k) => {
      if (rooms) score[1 + k]! += sign * Math.max(0, rooms[r]!.size - 1);
    });
    const occupancy = this.occupancy[r]!;
    const room = this.prepared.rooms[r]!;
    score[this.levels - 2]! += sign * Math.max(0, occupancy - room.baseBeds);
    score[this.levels - 1]! += sign * (occupancy > 0 ? 1 : 0);
  }

  /** U2 and U4 of participant i. */
  private addPerson(score: number[], i: number, sign: number): void {
    const r = this.room[i];
    const own = this.prepared.crossTermRooms[i]!;
    if (own.length > 0 && r !== undefined && !own.includes(r))
      score[0]! += sign;
    const p = this.prepared.participants[i]!;
    if (
      !this.prepared.locked.has(i) &&
      p.savedRoomId !== undefined &&
      r !== this.prepared.savedRoom[i]
    )
      score[this.levels - 3]! += sign;
  }

  /** U3 wishes: unmet wishes of pair p. */
  private addPair(score: number[], p: number, sign: number): void {
    if (this.wishLevel < 1) return;
    const { a, b, wishes } = this.pairs[p]!;
    const met = this.room[a] !== undefined && this.room[a] === this.room[b];
    if (!met) score[this.wishLevel]! += sign * wishes;
  }
}

function count<K>(map: Map<K, number>, key: K, by: number): void {
  const next = (map.get(key) ?? 0) + by;
  if (next === 0) map.delete(key);
  else map.set(key, next);
}
