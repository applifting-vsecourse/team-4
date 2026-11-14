import { prepareProposal, scoreLayout } from './room-proposal-layout';
import { searchLayout } from './room-proposal-search';
import {
  ProposalParticipant,
  ProposalRoom,
  RoomProposalInput,
  RoomProposalResult,
} from './room-proposal.types';
import { solveRoomProposal } from './solve-room-proposal';

// The examples of docs/architecture/accommodation-solver-phase-2.md §8, plus
// the levels and edge cases they do not pin down. Unless stated otherwise:
// gender as the hard attribute, everyone confirmed, person order P1, P2, …,
// no saved placements or wishes, preferences [wishes].

const room = (
  id: string,
  baseBeds: number,
  extraBeds = 0,
  available = true,
): ProposalRoom => ({ id, label: id, available, baseBeds, extraBeds });

const person = (
  id: string,
  value: string | null,
  extra: Partial<ProposalParticipant> = {},
): ProposalParticipant => ({
  id,
  position: Number(id.slice(1)),
  value,
  softValues: {},
  otherTermRoomIds: [],
  ...extra,
});

const women = (...ids: string[]): ProposalParticipant[] =>
  ids.map((id) => person(id, 'Ž'));

const wishes = (...pairs: string[]): RoomProposalInput['wishes'] =>
  pairs.map((pair) => {
    const [from, to] = pair.split('>');
    return { from: from!, to: to! };
  });

const gender = (neutralValues: string[] = []) =>
  ({ kind: 'attribute', id: 'gender', neutralValues }) as const;

const input = (partial: Partial<RoomProposalInput>): RoomProposalInput => ({
  rooms: [],
  hasHardAttribute: true,
  participants: [],
  wishes: [],
  preferences: [{ kind: 'wishes' }],
  ...partial,
});

type Solved = Extract<RoomProposalResult, { status: 'solved' }>;

async function solve(partial: Partial<RoomProposalInput>): Promise<Solved> {
  const result = await solveRoomProposal(input(partial));
  if (result.status !== 'solved') throw new Error(result.status);
  return result;
}

/** People of each used room, in person order. */
function byRoom(result: Solved): Record<string, string[]> {
  const rooms: Record<string, string[]> = {};
  for (const [id, roomId] of Object.entries(result.rooms)) {
    (rooms[roomId] ??= []).push(id);
  }
  for (const ids of Object.values(rooms))
    ids.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return rooms;
}

const state = (result: Solved, wish: string): string | undefined => {
  const [from, to] = wish.split('>');
  return result.wishes.find((w) => w.from === from && w.to === to)?.state;
};

describe('room proposal (spec §8)', () => {
  it('Př. 1: meets every wish', async () => {
    const result = await solve({
      rooms: [room('R1', 2), room('R2', 2)],
      participants: women('P1', 'P2', 'P3', 'P4'),
      wishes: wishes('P1>P3', 'P3>P1', 'P2>P4'),
    });
    expect(byRoom(result)).toEqual({ R1: ['P1', 'P3'], R2: ['P2', 'P4'] });
    expect(result.wishes.map((w) => w.state)).toEqual([
      'satisfied',
      'satisfied',
      'satisfied',
    ]);
    expect(result.scores.preferences).toEqual([0]);
  });

  it('Př. 2: a mutual wish beats a one-sided one', async () => {
    const result = await solve({
      rooms: [room('R1', 2), room('R2', 2)],
      participants: women('P1', 'P2', 'P3', 'P4'),
      wishes: wishes('P1>P2', 'P2>P1', 'P3>P1'),
    });
    expect(byRoom(result)).toEqual({ R1: ['P1', 'P2'], R2: ['P3', 'P4'] });
    expect(state(result, 'P3>P1')).toBe('unsatisfied');
    expect(result.scores.preferences).toEqual([1]);
  });

  it('Př. 3: a wish across the hard attribute cannot be met', async () => {
    const result = await solve({
      rooms: [room('R1', 2), room('R2', 2)],
      participants: [person('P1', 'Ž'), person('P2', 'M'), person('P3', 'Ž')],
      wishes: wishes('P1>P2'),
    });
    expect(byRoom(result)).toEqual({ R1: ['P1', 'P3'], R2: ['P2'] });
    expect(state(result, 'P1>P2')).toBe('impossible');
  });

  it('Př. 4: each preference strictly beats the ones below it', async () => {
    const participants = ['Ž', 'M', 'Ž', 'M'].map((value, i) =>
      person(`P${i + 1}`, null, { softValues: { gender: value } }),
    );
    const common = {
      hasHardAttribute: false,
      rooms: [room('R1', 2), room('R2', 2)],
      participants,
      wishes: wishes('P1>P2'),
    };
    const wishesFirst = await solve({
      ...common,
      preferences: [{ kind: 'wishes' }, gender()],
    });
    expect(byRoom(wishesFirst)).toEqual({
      R1: ['P1', 'P2'],
      R2: ['P3', 'P4'],
    });
    expect(wishesFirst.scores.preferences).toEqual([0, 2]);

    const genderFirst = await solve({
      ...common,
      preferences: [gender(), { kind: 'wishes' }],
    });
    expect(byRoom(genderFirst)).toEqual({
      R1: ['P1', 'P3'],
      R2: ['P2', 'P4'],
    });
    expect(genderFirst.scores.preferences).toEqual([0, 1]);
  });

  it('Př. 5: neutral answers do not count, and never below zero', async () => {
    const values = ['Ž', 'Nechci uvést', 'M'];
    const common = {
      hasHardAttribute: false,
      rooms: [room('R1', 2), room('R2', 2)],
      participants: values.map((value, i) =>
        person(`P${i + 1}`, null, { softValues: { gender: value } }),
      ),
      preferences: [gender(['Jiná odpověď', 'Nechci uvést'])],
    };
    const result = await solve(common);
    expect(byRoom(result)).toEqual({ R1: ['P1', 'P2'], R2: ['P3'] });
    expect(result.scores.preferences).toEqual([0]);

    // R1 {P1, P3} + R2 {P2}: 1 for R1, 0 (not −1) for the neutral-only R2.
    const prepared = prepareProposal(input(common));
    expect(scoreLayout(prepared, [0, 1, 0]).preferences).toEqual([1]);
  });

  it('Př. 6: unplaceable people get reasons H, K and N', async () => {
    const rooms = [room('R1', 2), room('R2', 2), room('R3', 2, 0, false)];
    const four = [
      person('P1', 'Ž'),
      person('P2', 'M'),
      person('P3', 'Ž'),
      person('P4', 'Ž'),
    ];
    const h = await solve({ rooms, participants: four });
    expect(byRoom(h)).toEqual({ R1: ['P1', 'P3'], R2: ['P2'] });
    expect(h.unplaced).toEqual([{ id: 'P4', reason: 'H' }]);

    const k = await solve({
      rooms,
      participants: [...four, person('P5', 'M')],
    });
    expect(byRoom(k)).toEqual({ R1: ['P1', 'P3'], R2: ['P2', 'P5'] });
    expect(k.unplaced).toEqual([{ id: 'P4', reason: 'K' }]);

    const n = await solve({
      rooms: [room('R1', 2, 0, false)],
      participants: four.slice(0, 2),
    });
    expect(n.unplaced).toEqual([
      { id: 'P1', reason: 'N' },
      { id: 'P2', reason: 'N' },
    ]);
  });

  it('Př. 7: locks keep a mixed room and close it; unlocked ones do not', async () => {
    const mixed = await solve({
      rooms: [room('R1', 3), room('R2', 2)],
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R1', locked: true }),
        person('P2', 'M', { savedRoomId: 'R1', locked: true }),
        person('P3', 'Ž'),
        person('P4', 'Ž'),
        person('P5', 'M'),
      ],
    });
    expect(byRoom(mixed)).toEqual({ R1: ['P1', 'P2'], R2: ['P3', 'P4'] });
    expect(mixed.warnings).toEqual([{ roomId: 'R1', kind: 'mixed' }]);
    expect(mixed.unplaced).toEqual([{ id: 'P5', reason: 'H' }]);

    const value = await solve({
      rooms: [room('R1', 2), room('R2', 1)],
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R1', locked: true }),
        person('P2', 'M'),
        person('P3', 'M'),
      ],
    });
    expect(byRoom(value)).toEqual({ R1: ['P1'], R2: ['P2'] });
    expect(value.unplaced).toEqual([{ id: 'P3', reason: 'H' }]);

    const unlocked = await solve({
      rooms: [room('R1', 2), room('R2', 2)],
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R1' }),
        person('P2', 'M', { savedRoomId: 'R1' }),
      ],
    });
    expect(byRoom(unlocked)).toEqual({ R1: ['P1'], R2: ['P2'] });
    expect(unlocked.scores.moves).toBe(1);
    expect(unlocked.warnings).toEqual([]);
  });

  it('Př. 8: the room of other terms beats wishes and this term’s unlocked placements', async () => {
    const rooms = [room('R1', 2), room('R2', 2)];
    const fromT1 = { otherTermRoomIds: ['R1'] };
    const t2 = await solve({
      rooms,
      participants: [
        person('P1', 'Ž', fromT1),
        person('P2', 'Ž', fromT1),
        ...women('P3', 'P4'),
      ],
      wishes: wishes('P3>P1'),
    });
    expect(byRoom(t2)).toEqual({ R1: ['P1', 'P2'], R2: ['P3', 'P4'] });
    expect(t2.scores.crossTerm).toBe(0);
    expect(state(t2, 'P3>P1')).toBe('unsatisfied');

    const savedHere = (locked: boolean): Partial<ProposalParticipant> => ({
      savedRoomId: 'R1',
      locked,
    });
    const moved = await solve({
      rooms,
      participants: [
        person('P1', 'Ž', fromT1),
        person('P2', 'Ž', fromT1),
        person('P3', 'Ž', savedHere(false)),
        person('P4', 'Ž', savedHere(false)),
      ],
    });
    expect(byRoom(moved)).toEqual({ R1: ['P1', 'P2'], R2: ['P3', 'P4'] });
    expect(moved.scores.moves).toBe(2);

    const kept = await solve({
      rooms,
      participants: [
        person('P1', 'Ž', fromT1),
        person('P2', 'Ž', fromT1),
        person('P3', 'Ž', savedHere(true)),
        person('P4', 'Ž', savedHere(true)),
      ],
    });
    expect(byRoom(kept)).toEqual({ R1: ['P3', 'P4'], R2: ['P1', 'P2'] });
    expect(kept.scores.crossTerm).toBe(2);
  });

  it('Př. 8: placements in both terms do not pull each other', async () => {
    const rooms = [room('R1', 2), room('R2', 2)];
    const t1 = await solve({
      rooms,
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R1', otherTermRoomIds: ['R2'] }),
      ],
    });
    const t2 = await solve({
      rooms,
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R2', otherTermRoomIds: ['R1'] }),
      ],
    });
    expect(t1.rooms).toEqual({ P1: 'R1' });
    expect(t2.rooms).toEqual({ P1: 'R2' });
  });

  it('Př. 9: keeps saved rooms, and moves one person for a new wish', async () => {
    const rooms = [room('R1', 2), room('R2', 2), room('R3', 2)];
    const participants = ['R1', 'R2', 'R3'].map((savedRoomId, i) =>
      person(`P${i + 1}`, 'Ž', { savedRoomId }),
    );
    const kept = await solve({ rooms, participants });
    expect(byRoom(kept)).toEqual({ R1: ['P1'], R2: ['P2'], R3: ['P3'] });
    expect(kept.scores).toMatchObject({ moves: 0, rooms: 3 });

    const wished = await solve({
      rooms,
      participants,
      wishes: wishes('P1>P2'),
    });
    expect(byRoom(wished)).toEqual({ R1: ['P1', 'P2'], R3: ['P3'] });
    expect(wished.scores.moves).toBe(1);
  });

  it('Př. 10: base beds before fewer rooms, wishes before base beds', async () => {
    const rooms = [room('R1', 2, 1), room('R2', 2)];
    const participants = women('P1', 'P2', 'P3');
    const plain = await solve({ rooms, participants });
    expect(byRoom(plain)).toEqual({ R1: ['P1', 'P2'], R2: ['P3'] });
    expect(plain.scores.extraBeds).toBe(0);

    const wished = await solve({
      rooms,
      participants,
      wishes: wishes('P3>P1', 'P3>P2'),
    });
    expect(byRoom(wished)).toEqual({ R1: ['P1', 'P2', 'P3'] });
    expect(wished.scores.extraBeds).toBe(1);
  });

  it('Př. 11: ties follow room and person order, every time', async () => {
    const proposal = (): Promise<Solved> =>
      solve({
        rooms: [
          { ...room('a', 2), label: 'Pokoj 10' },
          { ...room('b', 2), label: 'Pokoj 2' },
        ],
        participants: women('P1', 'P2', 'P3', 'P4'),
      });
    const first = await proposal();
    expect(byRoom(first)).toEqual({ b: ['P1', 'P2'], a: ['P3', 'P4'] });
    expect((await proposal()).rooms).toEqual(first.rooms);
  });

  it('Př. 12: a lock to an unavailable room is a conflict, not unplaced', async () => {
    const result = await solve({
      rooms: [room('R1', 2, 0, false), room('R2', 2)],
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R1', locked: true }),
        ...women('P2', 'P3'),
      ],
      wishes: wishes('P2>P1'),
    });
    expect(byRoom(result)).toEqual({ R2: ['P2', 'P3'] });
    expect(result.lockConflicts).toEqual([{ id: 'P1', roomId: 'R1' }]);
    expect(result.unplaced).toEqual([]);
    expect(state(result, 'P2>P1')).toBe('unplaced');
    expect(result.scores.placed).toBe(2);
  });

  it('Př. 13: a proposal made from its own applied layout moves nobody', async () => {
    const rooms = [room('R1', 2), room('R2', 2), room('R3', 2)];
    const first = await solve({
      rooms,
      participants: ['R1', 'R2', 'R3'].map((savedRoomId, i) =>
        person(`P${i + 1}`, 'Ž', { savedRoomId }),
      ),
      wishes: wishes('P1>P2'),
    });
    const again = await solve({
      rooms,
      participants: ['P1', 'P2', 'P3'].map((id) =>
        person(id, 'Ž', { savedRoomId: first.rooms[id] }),
      ),
      wishes: wishes('P1>P2'),
    });
    expect(again.rooms).toEqual(first.rooms);
    expect(again.scores.moves).toBe(0);
  });
});

describe('room proposal edge cases', () => {
  it('shows an empty term as an empty proposal', async () => {
    const result = await solve({ rooms: [room('R1', 2)] });
    expect(result).toMatchObject({ rooms: {}, unplaced: [], wishes: [] });
  });

  it('keeps locks over capacity, closes the room and counts its extra beds', async () => {
    const result = await solve({
      rooms: [room('R1', 1), room('R2', 1)],
      participants: [
        person('P1', 'Ž', { savedRoomId: 'R1', locked: true }),
        person('P2', 'Ž', { savedRoomId: 'R1', locked: true }),
        person('P3', 'Ž'),
      ],
    });
    expect(byRoom(result)).toEqual({ R1: ['P1', 'P2'], R2: ['P3'] });
    expect(result.warnings).toEqual([{ roomId: 'R1', kind: 'overCapacity' }]);
    expect(result.scores.extraBeds).toBe(1);
  });

  it('places by person order when not everyone fits', async () => {
    const result = await solve({
      rooms: [room('R1', 2)],
      participants: women('P3', 'P1', 'P2'),
    });
    expect(byRoom(result)).toEqual({ R1: ['P1', 'P2'] });
    expect(result.unplaced).toEqual([{ id: 'P3', reason: 'K' }]);
  });

  it('ignores wishes to people who are not confirmed in the term', async () => {
    const result = await solve({
      rooms: [room('R1', 2)],
      participants: women('P1'),
      wishes: wishes('P1>P9', 'P1>P1'),
    });
    expect(result.wishes).toEqual([]);
  });

  it('gives the same proposal however the input arrays are ordered', async () => {
    const rooms = ['R1', 'R2', 'R3', 'R4', 'R5'].map((id, r) =>
      room(id, 2 + (r % 2), r % 2),
    );
    const participants = Array.from({ length: 12 }, (_, i) =>
      person(`P${i + 1}`, i % 3 === 0 ? 'M' : 'Ž', {
        softValues: { age: i % 2 === 0 ? 'young' : 'old' },
        savedRoomId: i % 4 === 0 ? rooms[i % 5]!.id : undefined,
        otherTermRoomIds: i % 5 === 1 ? ['R2', 'R4', 'R1'] : [],
      }),
    );
    const common = {
      rooms,
      participants,
      wishes: wishes('P2>P3', 'P3>P2', 'P5>P6', 'P7>P2', 'P8>P9', 'P11>P12'),
      preferences: [
        { kind: 'wishes' as const },
        { kind: 'attribute' as const, id: 'age', neutralValues: [] },
      ],
    };
    const reversed = {
      ...common,
      rooms: [...common.rooms].reverse(),
      participants: [...common.participants].reverse().map((p) => ({
        ...p,
        otherTermRoomIds: [...p.otherTermRoomIds].reverse(),
      })),
      wishes: [...common.wishes].reverse(),
    };
    expect((await solve(reversed)).rooms).toEqual((await solve(common)).rooms);
  });

  it('keeps the starting layout and reports it incomplete past the deadline', () => {
    const prepared = prepareProposal(
      input({
        rooms: [room('R1', 2), room('R2', 2)],
        participants: women('P1', 'P2', 'P3'),
        wishes: wishes('P1>P3'),
      }),
    );
    const start = [0, 0, 1];
    const result = searchLayout(prepared, start, { deadline: Date.now() - 1 });
    expect(result).toEqual({ layout: start, complete: false });
  });

  it('reports a timeout when U1 cannot finish', async () => {
    const result = await solveRoomProposal(
      input({ rooms: [room('R1', 2)], participants: women('P1') }),
      { timeLimitMs: 0 },
    );
    expect(result.status).toBe('timeout');
  });
});
