import {
  buildProposalView,
  ProposalTermView,
  StoredProposal,
} from '@/modules/accommodation/domain/proposal-view';
import {
  ProposalParticipant,
  RoomProposalResult,
} from '@/modules/accommodation/solver/room-proposal.types';

const person = (
  id: string,
  position: number,
  extra: Partial<ProposalParticipant> = {},
): ProposalParticipant => ({
  id,
  position,
  value: 'female',
  softValues: {},
  otherTermRoomIds: [],
  ...extra,
});

const solved = (
  rooms: Record<string, string>,
  extra: Partial<Extract<RoomProposalResult, { status: 'solved' }>> = {},
): RoomProposalResult => ({
  status: 'solved',
  rooms,
  unplaced: [],
  lockConflicts: [],
  warnings: [],
  wishes: [],
  scores: {
    placed: Object.keys(rooms).length,
    crossTerm: 0,
    preferences: [0],
    moves: 0,
    extraBeds: 0,
    rooms: new Set(Object.values(rooms)).size,
  },
  stats: { millis: 5, solves: 1, complete: true },
  ...extra,
});

const stored = (
  participants: ProposalParticipant[],
  result: RoomProposalResult | null,
  extra: Partial<StoredProposal> = {},
): StoredProposal => ({
  id: 'proposal',
  status: result?.status ?? 'failed',
  triggeredBy: null,
  startedAt: new Date('2027-03-01T10:00:00Z'),
  finishedAt: new Date('2027-03-01T10:00:01Z'),
  layoutVersion: 3,
  input: {
    rooms: [
      {
        id: 'r10',
        label: 'Pokoj 10',
        available: true,
        baseBeds: 2,
        extraBeds: 0,
      },
      {
        id: 'r2',
        label: 'Pokoj 2',
        available: true,
        baseBeds: 2,
        extraBeds: 1,
      },
      {
        id: 'r1',
        label: 'Pokoj 1',
        available: false,
        baseBeds: 2,
        extraBeds: 0,
      },
    ],
    hasHardAttribute: true,
    participants,
    wishes: [],
    preferences: [{ kind: 'wishes' }],
  },
  result,
  ...extra,
});

const names = new Map([
  ['A', { firstName: 'Anna', lastName: 'Malá' }],
  ['B', { firstName: 'Bára', lastName: 'Velká' }],
]);

const view = (
  latest: StoredProposal | null,
  layoutVersion = 3,
  isRunning = false,
): ProposalTermView =>
  buildProposalView({ latest, layoutVersion, isRunning, names });

describe('the status of a term’s room proposal', () => {
  const proposal = stored([person('A', 0)], solved({ A: 'r2' }));

  it('is none before the first proposal', () => {
    expect(view(null)).toEqual({
      status: 'none',
      layoutVersion: 3,
      proposal: null,
    });
  });

  it('is current on the term’s layout version and stale after a change', () => {
    expect(view(proposal).status).toBe('current');
    expect(view(proposal).proposal?.isCurrent).toBe(true);
    expect(view(proposal, 4).status).toBe('stale');
    expect(view(proposal, 4).proposal?.isCurrent).toBe(false);
  });

  it('is running while a proposal runs or was asked for, and keeps the last one', () => {
    const running = view(proposal, 4, true);
    expect(running.status).toBe('running');
    expect(running.proposal?.layout?.rooms).toHaveLength(3);
  });

  it('shows a failed or timed-out proposal without a layout', () => {
    const failed = view(stored([person('A', 0)], null));
    expect(failed).toMatchObject({
      status: 'failed',
      proposal: { layout: null },
    });
    const timeout = view(
      stored([person('A', 0)], {
        status: 'timeout',
        stats: { millis: 30_000, solves: 1, complete: false },
      }),
    );
    expect(timeout).toMatchObject({
      status: 'timeout',
      proposal: { layout: null },
    });
  });
});

describe('the layout of a solved proposal', () => {
  it('lists every room in room order with its people', () => {
    const layout = view(
      stored([person('B', 1), person('A', 0)], solved({ A: 'r2', B: 'r2' })),
    ).proposal!.layout!;

    expect(layout.rooms.map((r) => [r.label, r.personIds])).toEqual([
      ['Pokoj 1', []],
      ['Pokoj 2', ['A', 'B']],
      ['Pokoj 10', []],
    ]);
    expect(layout.rooms[0]!.isAvailable).toBe(false);
    expect(layout.people.map((p) => `${p.firstName} ${p.lastName}`)).toEqual([
      'Anna Malá',
      'Bára Velká',
    ]);
  });

  it('compares each person with the saved placement (§7.2)', () => {
    const layout = view(
      stored(
        [
          person('new', 0),
          person('moved', 1, { savedRoomId: 'r10' }),
          person('kept', 2, { savedRoomId: 'r2' }),
          person('removed', 3, { savedRoomId: 'r10' }),
          person('none', 4),
          person('conflict', 5, { savedRoomId: 'r1', locked: true }),
        ],
        solved(
          { new: 'r2', moved: 'r2', kept: 'r2' },
          {
            unplaced: [
              { id: 'removed', reason: 'K' },
              { id: 'none', reason: 'K' },
            ],
            lockConflicts: [{ id: 'conflict', roomId: 'r1' }],
          },
        ),
      ),
    ).proposal!.layout!;

    expect(
      Object.fromEntries(layout.people.map((p) => [p.id, p.change])),
    ).toEqual({
      new: 'new',
      moved: 'moved',
      kept: 'unchanged',
      removed: 'removed',
      none: null,
      conflict: null,
    });
    expect(layout.people.find((p) => p.id === 'conflict')).toMatchObject({
      isLockConflict: true,
      isLocked: true,
      roomId: null,
      reason: null,
    });
    expect(layout.people.find((p) => p.id === 'none')?.reason).toBe('K');
    expect(layout.summary).toEqual({
      placed: 3,
      unplaced: 2,
      lockConflicts: 1,
      added: 1,
      moved: 1,
      removed: 1,
      rooms: 1,
      extraBeds: 0,
    });
  });

  it('marks a layout that ran out of time after U1 as not the best possible', () => {
    const layout = view(
      stored(
        [person('A', 0)],
        solved(
          { A: 'r2' },
          { stats: { millis: 30_000, solves: 9, complete: false } },
        ),
      ),
    ).proposal!.layout!;
    expect(layout.isComplete).toBe(false);
  });
});
