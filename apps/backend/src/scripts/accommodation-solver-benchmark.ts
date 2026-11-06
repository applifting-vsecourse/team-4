import { solveAssignment } from '@/modules/accommodation/solver/solve-assignment';
import {
  Candidate,
  SolverInput,
  SolverRoom,
} from '@/modules/accommodation/solver/solver.types';

// Spike of S3-T3 (#181, spec v4 §9): the worst case the solver must handle in
// 30 s per term. 200 participants over three overlapping terms, many rooms of
// the same size, gender as the hard attribute and 3–5 ranked soft attributes.
// Compares the specified staged solve with one weighted objective.
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

function scenario(seed: number, softCount: number): SolverInput[] {
  const next = random(seed);
  const pick = <T>(values: T[]): T =>
    values[Math.floor(next() * values.length)]!;
  const softAttributes = Array.from(
    { length: softCount },
    (_, k) => `soft${k}`,
  );
  const people = Array.from({ length: PARTICIPANTS }, (_, i) => {
    const roll = next();
    const value = roll < 0.48 ? 'Ž' : roll < 0.96 ? 'M' : null;
    const softValues = Object.fromEntries(
      softAttributes.map((attribute, k) => [
        attribute,
        pick(['a', 'b', 'c', 'd'].slice(0, 2 + (k % 3))),
      ]),
    );
    // Overlapping terms: most register for one or two, some for all three.
    const terms = Array.from({ length: TERMS }, (_, t) => t).filter(
      () => next() < 0.6,
    );
    return {
      id: `P${i + 1}`,
      value,
      softValues,
      terms: terms.length ? terms : [0],
    };
  });
  const allRooms = rooms();
  return Array.from({ length: TERMS }, (_, t) => {
    const registered = people.filter((p) => p.terms.includes(t));
    const candidates: Candidate[] = registered.map((p, position) => ({
      id: p.id,
      value: p.value,
      position,
      softValues: p.softValues,
    }));
    return {
      // Term 2 loses a few rooms, so not every term has the same capacity.
      rooms: t === 1 ? allRooms.slice(0, 34) : allRooms,
      hasHardAttribute: true,
      softAttributes,
      confirmed: [],
      candidates,
    };
  });
}

type Variant = {
  name: string;
  strategy: 'staged' | 'weighted';
  breakSymmetry: boolean;
  phase: 1 | 2;
};

const VARIANTS: Variant[] = [
  { name: 'phase 1', strategy: 'staged', breakSymmetry: false, phase: 1 },
  { name: 'phase 2', strategy: 'staged', breakSymmetry: false, phase: 2 },
  {
    name: 'phase 2 + symmetry',
    strategy: 'staged',
    breakSymmetry: true,
    phase: 2,
  },
  {
    name: 'weighted (phase 2)',
    strategy: 'weighted',
    breakSymmetry: false,
    phase: 2,
  },
];

async function main(): Promise<void> {
  for (const softCount of [3, 5]) {
    const terms = scenario(181, softCount);
    console.log(`\n${softCount} soft attributes`);
    const reference: string[][] = [];
    for (const variant of VARIANTS) {
      for (const [t, input] of terms.entries()) {
        const beds = input.rooms.reduce(
          (s, r) => s + r.baseBeds + r.extraBeds,
          0,
        );
        const result = await solveAssignment(input, {
          strategy: variant.strategy,
          breakSymmetry: variant.breakSymmetry,
          phase: variant.phase,
        });
        let detail: string = result.status;
        if (result.status === 'solved') {
          if (variant === VARIANTS[0]) reference[t] = result.suitable;
          const sameSet =
            reference[t] &&
            [...result.suitable].sort().join() ===
              [...reference[t]].sort().join();
          detail =
            `suitable ${result.suitable.length}, extra beds ${result.beds.extraUsed}, ` +
            `rooms ${new Set(Object.values(result.rooms)).size}` +
            (result.stats.complete ? '' : ', layout not proven optimal') +
            (variant === VARIANTS[0]
              ? ''
              : sameSet
                ? ', same people'
                : ', DIFFERENT people');
        }
        console.log(
          `  ${variant.name.padEnd(22)} term ${t + 1}: ${input.candidates.length} candidates, ` +
            `${beds} beds → ${detail} in ${result.stats.millis} ms (${result.stats.solves} solves)`,
        );
      }
    }

    // Overbooked: everyone in one term with the smaller set of rooms, so the
    // priority level has to decide who of many equals gets a place.
    const everyone = terms.flatMap((term) => term.candidates);
    const unique = [...new Map(everyone.map((c) => [c.id, c])).values()];
    const overbooked = await solveAssignment({
      ...terms[1]!,
      candidates: unique.map((c, position) => ({ ...c, position })),
    });
    const overbookedRooms = await solveAssignment(
      {
        ...terms[1]!,
        candidates: unique.map((c, position) => ({ ...c, position })),
      },
      { phase: 2 },
    );
    console.log(
      `  overbooked, phase 2: ${unique.length} candidates → ` +
        (overbookedRooms.status === 'solved'
          ? `suitable ${overbookedRooms.suitable.length}` +
            (overbookedRooms.stats.complete
              ? ''
              : ', layout not proven optimal')
          : overbookedRooms.status) +
        ` in ${overbookedRooms.stats.millis} ms (${overbookedRooms.stats.solves} solves)`,
    );
    console.log(
      `  overbooked, phase 1: ${unique.length} candidates → ` +
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
          .map((c) => ({ id: c.id, value: c.value, softValues: c.softValues })),
        candidates: input.candidates
          .filter((c) => !confirmedIds.has(c.id))
          .map((c, position) => ({ ...c, position })),
      });
      console.log(
        `  rerun with 60 confirmed, term 1: ${rerun.status} in ${rerun.stats.millis} ms (${rerun.stats.solves} solves)`,
      );
    }
  }
}

void main();
