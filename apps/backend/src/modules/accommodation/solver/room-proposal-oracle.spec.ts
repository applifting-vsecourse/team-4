import {
  ProposalParticipant,
  ProposalRoom,
  RoomProposalInput,
  SoftPreference,
} from './room-proposal.types';
import { solveRoomProposal } from './solve-room-proposal';

// ADR-0002: on small random terms, where the exact staged solve proves every
// level optimal, the local search must reach the same scores U1–U6. Ties
// (U7) are only as early as simple moves reach, but always the same.

function random(seed: number): () => number {
  let state = seed;
  return (): number => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function randomTerm(seed: number): RoomProposalInput {
  const next = random(seed);
  const int = (max: number): number => Math.floor(next() * (max + 1));
  const pick = <T>(values: T[]): T => values[int(values.length - 1)]!;
  const hasHardAttribute = next() < 0.7;
  const rooms: ProposalRoom[] = Array.from({ length: 2 + int(3) }, (_, r) => ({
    id: `R${r + 1}`,
    label: `Pokoj ${r + 1}`,
    available: next() < 0.9,
    baseBeds: 1 + int(3),
    extraBeds: int(1),
  }));
  const roomIds = rooms.map((room) => room.id);
  const participants: ProposalParticipant[] = Array.from(
    { length: 2 + int(7) },
    (_, i) => {
      const saved = next() < 0.4 ? pick(roomIds) : undefined;
      return {
        id: `P${i + 1}`,
        position: i,
        value: hasHardAttribute ? pick(['Ž', 'M']) : null,
        softValues: { age: next() < 0.2 ? null : pick(['young', 'old']) },
        savedRoomId: saved,
        locked: saved !== undefined && next() < 0.25,
        otherTermRoomIds: next() < 0.3 ? [pick(roomIds)] : [],
      };
    },
  );
  const wishes = participants.flatMap((p) =>
    next() < 0.4 ? [{ from: p.id, to: pick(participants).id }] : [],
  );
  const age: SoftPreference = {
    kind: 'attribute',
    id: 'age',
    neutralValues: [],
  };
  const wishList: SoftPreference = { kind: 'wishes' };
  const preferences = pick<SoftPreference[]>([
    [wishList, age],
    [age, wishList],
    [wishList],
    [],
  ]);
  return { rooms, hasHardAttribute, participants, wishes, preferences };
}

describe('local search against the exact staged solve', () => {
  it.each(Array.from({ length: 60 }, (_, i) => i + 1))(
    'reaches the exact scores, reproducibly (term %i)',
    async (seed) => {
      const input = randomTerm(seed);
      const [exact, search] = await Promise.all([
        solveRoomProposal(input, { strategy: 'exact' }),
        solveRoomProposal(input),
      ]);
      expect(search.status).toBe(exact.status);
      if (exact.status !== 'solved' || search.status !== 'solved') return;
      expect(exact.stats.complete).toBe(true);
      expect(search.scores).toEqual(exact.scores);
      const again = await solveRoomProposal(input);
      expect(again.status === 'solved' && again.rooms).toEqual(search.rooms);
    },
  );
});
