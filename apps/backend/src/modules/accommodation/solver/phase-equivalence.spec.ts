import { solveAssignment } from './solve-assignment';
import { SolverInput } from './solver.types';

// Phase 1 decides on an aggregate model (interchangeable rooms and people).
// On small random terms it must pick the same people with the same reasons
// as the room-level model of phase 2, which models every room and person.

function random(seed: number): () => number {
  let state = seed;
  return (): number => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function randomTerm(seed: number): SolverInput {
  const next = random(seed);
  const int = (max: number): number => Math.floor(next() * (max + 1));
  const hasHardAttribute = next() < 0.8;
  const value = (): string | null => {
    const roll = next();
    if (!hasHardAttribute) return null;
    return roll < 0.45 ? 'Ž' : roll < 0.9 ? 'M' : roll < 0.95 ? 'X' : null;
  };
  const rooms = Array.from({ length: 1 + int(5) }, (_, r) => ({
    id: `R${r + 1}`,
    baseBeds: int(4),
    extraBeds: int(1),
  }));
  const confirmed = Array.from({ length: int(3) }, (_, i) => ({
    id: `C${i + 1}`,
    value: hasHardAttribute ? (next() < 0.5 ? 'Ž' : 'M') : null,
  }));
  const candidates = Array.from({ length: int(14) }, (_, i) => ({
    id: `P${i + 1}`,
    value: value(),
    position: i,
  }));
  return { rooms, hasHardAttribute, confirmed, candidates };
}

describe('phase 1 against the room-level model', () => {
  it.each(Array.from({ length: 40 }, (_, i) => i + 1))(
    'picks the same people with the same reasons (term %i)',
    async (seed) => {
      const input = randomTerm(seed);
      const [aggregate, roomLevel] = await Promise.all([
        solveAssignment(input, { phase: 1 }),
        solveAssignment(input, { phase: 2 }),
      ]);
      expect(aggregate.status).toBe(roomLevel.status);
      if (aggregate.status === 'solved' && roomLevel.status === 'solved') {
        expect(aggregate.suitable).toEqual(roomLevel.suitable);
        expect(aggregate.unplaced).toEqual(roomLevel.unplaced);
        expect(aggregate.beds.extraUsed).toBe(roomLevel.beds.extraUsed);
      }
    },
  );
});
