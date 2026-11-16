import { toLp } from './assignment-model';
import { HighsRunner, loadHighs } from './highs-runner';
import { layoutOf, solveExactLevels } from './room-proposal-exact';
import {
  Layout,
  PreparedProposal,
  prepareProposal,
  scoreLayout,
  unplacedReasons,
  wishStates,
} from './room-proposal-layout';
import { buildProposalModel } from './room-proposal-model';
import { placeByPriority } from './room-proposal-placement';
import {
  ProposalParticipant,
  ProposalRoom,
  RoomProposalInput,
} from './room-proposal.types';

// The building blocks of the room proposal (phase 2, ADR-0002): preparing the
// input, the exact room-level solve that serves as the test oracle, and the
// exact U1 placement. The local search and the 13 spec examples of the whole
// proposal come with solveRoomProposal.

const room = (id: string, beds: number, available = true): ProposalRoom => ({
  id,
  label: id,
  available,
  baseBeds: beds,
  extraBeds: 0,
});

const person = (
  id: string,
  position: number,
  value: string | null = null,
  extra: Partial<ProposalParticipant> = {},
): ProposalParticipant => ({
  id,
  position,
  value,
  softValues: {},
  otherTermRoomIds: [],
  ...extra,
});

const input = (overrides: Partial<RoomProposalInput>): RoomProposalInput => ({
  rooms: [],
  hasHardAttribute: false,
  participants: [],
  wishes: [],
  preferences: [],
  ...overrides,
});

/** Room id of every placed participant. */
const roomsOf = (
  prepared: PreparedProposal,
  layout: Layout,
): Record<string, string> =>
  Object.fromEntries(
    prepared.participants.flatMap((p, i) =>
      layout[i] === undefined ? [] : [[p.id, prepared.rooms[layout[i]]!.id]],
    ),
  );

async function solveExact(prepared: PreparedProposal): Promise<Layout> {
  const model = buildProposalModel(prepared);
  const runner = new HighsRunner(
    await loadHighs(),
    (sense, objective, fixed) => toLp(model, sense, objective, fixed),
    model.constraints,
    Date.now() + 30_000,
  );
  const outcome = solveExactLevels(runner, prepared, model);
  expect(outcome.complete).toBe(true);
  return layoutOf(prepared, outcome.solution);
}

describe('preparing a room proposal', () => {
  it('orders rooms by label with numbers, and people by position', () => {
    const prepared = prepareProposal(
      input({
        rooms: [room('Pokoj 10', 2), room('Pokoj 2', 2), room('Pokoj 1', 2)],
        participants: [person('B', 1), person('A', 0)],
      }),
    );

    expect(prepared.rooms.map((r) => r.id)).toEqual([
      'Pokoj 1',
      'Pokoj 2',
      'Pokoj 10',
    ]);
    expect(prepared.participants.map((p) => p.id)).toEqual(['A', 'B']);
  });

  it('keeps a lock to an unavailable room as a conflict, not a placement (O6)', () => {
    const prepared = prepareProposal(
      input({
        rooms: [room('R1', 2, false), room('R2', 2)],
        participants: [
          person('A', 0, null, { savedRoomId: 'R1', locked: true }),
          person('B', 1),
        ],
      }),
    );

    expect(prepared.lockConflicts).toEqual([{ id: 'A', roomId: 'R1' }]);
    expect(prepared.participants.map((p) => p.id)).toEqual(['B']);
    expect(prepared.rooms.map((r) => r.id)).toEqual(['R2']);
  });
});

describe('the exact room-level solve (test oracle)', () => {
  const women = (ids: string[]): ProposalParticipant[] =>
    ids.map((id, i) => person(id, i, 'Ž'));

  it('meets every wish (spec Př. 1)', async () => {
    const prepared = prepareProposal(
      input({
        rooms: [room('R1', 2), room('R2', 2)],
        hasHardAttribute: true,
        participants: women(['P1', 'P2', 'P3', 'P4']),
        wishes: [
          { from: 'P1', to: 'P3' },
          { from: 'P3', to: 'P1' },
          { from: 'P2', to: 'P4' },
        ],
        preferences: [{ kind: 'wishes' }],
      }),
    );

    const layout = await solveExact(prepared);

    expect(roomsOf(prepared, layout)).toEqual({
      P1: 'R1',
      P3: 'R1',
      P2: 'R2',
      P4: 'R2',
    });
    expect(wishStates(prepared, layout).map((w) => w.state)).toEqual([
      'satisfied',
      'satisfied',
      'satisfied',
    ]);
    expect(scoreLayout(prepared, layout).preferences).toEqual([0]);
  });

  it('never meets a wish across hard-attribute values (spec Př. 3)', async () => {
    const prepared = prepareProposal(
      input({
        rooms: [room('R1', 2), room('R2', 2)],
        hasHardAttribute: true,
        participants: [
          person('P1', 0, 'Ž'),
          person('P2', 1, 'M'),
          person('P3', 2, 'Ž'),
        ],
        wishes: [{ from: 'P1', to: 'P2' }],
        preferences: [{ kind: 'wishes' }],
      }),
    );

    const layout = await solveExact(prepared);

    expect(roomsOf(prepared, layout)).toEqual({
      P1: 'R1',
      P3: 'R1',
      P2: 'R2',
    });
    expect(wishStates(prepared, layout)).toEqual([
      { from: 'P1', to: 'P2', state: 'impossible' },
    ]);
  });

  it('gives each unplaced person one reason: H, K or N (spec Př. 6)', async () => {
    const people = [
      person('P1', 0, 'Ž'),
      person('P2', 1, 'M'),
      person('P3', 2, 'Ž'),
      person('P4', 3, 'Ž'),
    ];
    const rooms = [room('R1', 2), room('R2', 2), room('R3', 2, false)];
    const solve = async (proposal: RoomProposalInput) => {
      const prepared = prepareProposal(proposal);
      const layout = await solveExact(prepared);
      return {
        rooms: roomsOf(prepared, layout),
        unplaced: unplacedReasons(prepared, layout),
      };
    };

    // A bed is free only in the men's room.
    expect(
      await solve(
        input({ rooms, hasHardAttribute: true, participants: people }),
      ),
    ).toEqual({
      rooms: { P1: 'R1', P3: 'R1', P2: 'R2' },
      unplaced: [{ id: 'P4', reason: 'H' }],
    });
    // Another man fills it: every bed is taken.
    expect(
      await solve(
        input({
          rooms,
          hasHardAttribute: true,
          participants: [...people, person('P5', 4, 'M')],
        }),
      ),
    ).toEqual({
      rooms: { P1: 'R1', P3: 'R1', P2: 'R2', P5: 'R2' },
      unplaced: [{ id: 'P4', reason: 'K' }],
    });
    // No room available in the term.
    const none = prepareProposal(
      input({
        rooms: [room('R3', 2, false)],
        hasHardAttribute: true,
        participants: people,
      }),
    );
    expect(
      unplacedReasons(
        none,
        none.participants.map(() => undefined),
      ).map((u) => u.reason),
    ).toEqual(['N', 'N', 'N', 'N']);
  });
});

describe('the exact U1 placement', () => {
  it('places the most people, by person order, without mixing values', async () => {
    // A single room and one of three beds: the men fill the large room, the
    // first woman takes the single one and the second stays unplaced.
    const prepared = prepareProposal(
      input({
        rooms: [room('Jednolůžko', 1), room('Chatka', 3)],
        hasHardAttribute: true,
        participants: [
          person('Ž1', 0, 'Ž'),
          person('M1', 1, 'M'),
          person('Ž2', 2, 'Ž'),
          person('M2', 3, 'M'),
          person('M3', 4, 'M'),
        ],
      }),
    );

    const { layout } = placeByPriority(
      prepared,
      await loadHighs(),
      Date.now() + 30_000,
    );

    expect(roomsOf(prepared, layout)).toEqual({
      Ž1: 'Jednolůžko',
      M1: 'Chatka',
      M2: 'Chatka',
      M3: 'Chatka',
    });
    expect(scoreLayout(prepared, layout).placed).toBe(4);
  });
});
