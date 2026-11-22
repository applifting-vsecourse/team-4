import { solveAssignment } from '@/modules/accommodation/solver/solve-assignment';
import {
  Candidate,
  SolverInput,
  SolverRoom,
} from '@/modules/accommodation/solver/solver.types';

// Spike of S3-T3 (#181, spec v4 §9) for phase 1: the worst case the
// evaluation must handle in 30 s per term. 200 participants over three
// overlapping terms, many rooms of the same size, gender as the hard
// attribute. Room proposals (phase 2) have their own benchmark:
// solver:proposal-benchmark.
//
//   pnpm backend solver:benchmark

const PARTICIPANTS = 200;
const TERMS = 3;

/** Deterministic, so runs can be compared. */
function random(seed: number): () => number {
  let state = seed;
  return (): number => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function rooms(): SolverRoom[] {
  const list: SolverRoom[] = [];
  const add = (count: number, baseBeds: number, extraBeds: number): void => {
    for (let i = 0; i < count; i += 1) {
      list.push({ id: `R${list.length + 1}`, baseBeds, extraBeds });
    }
  };
  add(24, 4, 0);
  add(8, 3, 1);
  add(6, 2, 1);
  add(2, 6, 2);
  return list;
}

function scenario(seed: number): SolverInput[] {
  const next = random(seed);
  const people = Array.from({ length: PARTICIPANTS }, (_, i) => {
    const roll = next();
    const value = roll < 0.48 ? 'Ž' : roll < 0.96 ? 'M' : null;
    // Overlapping terms: most register for one or two, some for all three.
    const terms = Array.from({ length: TERMS }, (_, t) => t).filter(
      () => next() < 0.6,
    );
    return { id: `P${i + 1}`, value, terms: terms.length ? terms : [0] };
  });
  const allRooms = rooms();
  return Array.from({ length: TERMS }, (_, t) => {
    const candidates: Candidate[] = people
      .filter((p) => p.terms.includes(t))
      .map((p, position) => ({ id: p.id, value: p.value, position }));
    return {
      // Term 2 loses a few rooms, so not every term has the same capacity.
      rooms: t === 1 ? allRooms.slice(0, 34) : allRooms,
      hasHardAttribute: true,
      confirmed: [],
      candidates,
    };
  });
}

async function main(): Promise<void> {
  const terms = scenario(181);
  for (const [t, input] of terms.entries()) {
    const beds = input.rooms.reduce((s, r) => s + r.baseBeds + r.extraBeds, 0);
    const result = await solveAssignment(input);
    const detail =
      result.status === 'solved'
        ? `suitable ${result.suitable.length}, extra beds ${result.beds.extraUsed}`
        : result.status;
    console.log(
      `term ${t + 1}: ${input.candidates.length} candidates, ${beds} beds → ` +
        `${detail} in ${result.stats.millis} ms (${result.stats.solves} solves)`,
    );
  }

  // Overbooked: everyone in one term with the smaller set of rooms, so the
  // priority level has to decide who of many equals gets a place.
  const everyone = terms.flatMap((term) => term.candidates);
  const unique = [...new Map(everyone.map((c) => [c.id, c])).values()];
  const overbooked = await solveAssignment({
    ...terms[1]!,
    candidates: unique.map((c, position) => ({ ...c, position })),
  });
  console.log(
    `overbooked: ${unique.length} candidates → ` +
      (overbooked.status === 'solved'
        ? `suitable ${overbooked.suitable.length}`
        : overbooked.status) +
      ` in ${overbooked.stats.millis} ms (${overbooked.stats.solves} solves)`,
  );

  // A later run: the first term's suitable are confirmed, and the rest compete.
  const first = await solveAssignment(terms[0]!);
  if (first.status === 'solved') {
    const confirmedIds = new Set(first.suitable.slice(0, 60));
    const input = terms[0]!;
    const rerun = await solveAssignment({
      ...input,
      confirmed: input.candidates
        .filter((c) => confirmedIds.has(c.id))
        .map((c) => ({ id: c.id, value: c.value })),
      candidates: input.candidates
        .filter((c) => !confirmedIds.has(c.id))
        .map((c, position) => ({ ...c, position })),
    });
    console.log(
      `rerun with 60 confirmed, term 1: ${rerun.status} in ${rerun.stats.millis} ms (${rerun.stats.solves} solves)`,
    );
  }
}

void main();
