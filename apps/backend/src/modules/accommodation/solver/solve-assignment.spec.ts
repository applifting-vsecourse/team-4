import { solveAssignment } from './solve-assignment';
import {
  Candidate,
  SolverInput,
  SolverResult,
  SolverRoom,
} from './solver.types';

// The examples of the specification (#181, v4 §8) for one term, with the
// gender preset as the hard attribute: Ž and M determine a room, null is a
// participant who needs a manual determination.

const room = (id: string, baseBeds: number, extraBeds = 0): SolverRoom => ({
  id,
  baseBeds,
  extraBeds,
});

/** Candidates in the given order: `["P1", "Ž"]` is position 0, and so on. */
const queue = (...entries: [string, string | null][]): Candidate[] =>
  entries.map(([id, value], position) => ({ id, value, position }));

const term = (overrides: Partial<SolverInput>): SolverInput => ({
  rooms: [],
  hasHardAttribute: true,
  confirmed: [],
  candidates: [],
  ...overrides,
});

type Solved = Extract<SolverResult, { status: 'solved' }>;

const solved = async (input: SolverInput): Promise<Solved> => {
  const result = await solveAssignment(input);
  if (result.status !== 'solved')
    throw new Error(`Not solved: ${result.status}`);
  return result;
};

const reasons = (result: Solved): Record<string, string> =>
  Object.fromEntries(result.unplaced.map(({ id, reason }) => [id, reason]));

describe('solveAssignment', () => {
  it('Př. 1: orders by position and leaves the last one out for capacity', async () => {
    // Candidates arrive ordered by receivedAt, then id: P2 before P1 here.
    const result = await solved(
      term({
        rooms: [room('R1', 2)],
        candidates: queue(['P2', 'Ž'], ['P1', 'Ž'], ['P3', 'Ž']),
      }),
    );
    expect(result.suitable).toEqual(['P2', 'P1']);
    expect(reasons(result)).toEqual({ P3: 'A' });
  });

  it('Př. 2: uses base beds first, then the extra bed as the last place', async () => {
    const rooms = [room('R1', 2, 1), room('R2', 2)];
    const four = await solved(
      term({
        rooms,
        candidates: queue(['P1', 'Ž'], ['P2', 'Ž'], ['P3', 'Ž'], ['P4', 'Ž']),
      }),
    );
    expect(four.suitable).toHaveLength(4);
    expect(four.beds).toEqual({ baseUsed: 4, extraUsed: 0, base: 4, extra: 1 });

    const six = await solved(
      term({
        rooms,
        candidates: queue(
          ['P1', 'Ž'],
          ['P2', 'Ž'],
          ['P3', 'Ž'],
          ['P4', 'Ž'],
          ['P5', 'Ž'],
          ['P6', 'Ž'],
        ),
      }),
    );
    expect(six.suitable).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(six.beds.extraUsed).toBe(1);
    expect(reasons(six)).toEqual({ P6: 'A' });

    const withoutExtra = await solved(
      term({
        rooms: [room('R1', 2), room('R2', 2)],
        candidates: queue(
          ['P1', 'Ž'],
          ['P2', 'Ž'],
          ['P3', 'Ž'],
          ['P4', 'Ž'],
          ['P5', 'Ž'],
        ),
      }),
    );
    expect(reasons(withoutExtra)).toEqual({ P5: 'A' });
  });

  it('Př. 3: keeps rooms homogeneous and explains a free bed of the other value', async () => {
    const result = await solved(
      term({
        rooms: [room('R1', 3), room('R2', 1)],
        candidates: queue(['P1', 'Ž'], ['P2', 'Ž'], ['P3', 'M'], ['P4', 'M']),
      }),
    );
    expect(result.suitable).toEqual(['P1', 'P2', 'P3']);
    expect(result.rooms).toMatchObject({ P1: 'R1', P2: 'R1', P3: 'R2' });
    expect(result.roomValues).toEqual({ R1: 'Ž', R2: 'M' });
    expect(reasons(result)).toEqual({ P4: 'B' });
  });

  it('Př. 4: accommodates more people before a higher position (variant M)', async () => {
    const rooms = [room('R1', 3)];
    const result = await solved(
      term({
        rooms,
        candidates: queue(['P1', 'M'], ['P2', 'Ž'], ['P3', 'Ž'], ['P4', 'Ž']),
      }),
    );
    expect(result.suitable).toEqual(['P2', 'P3', 'P4']);
    expect(reasons(result)).toEqual({ P1: 'C' });

    const p1Confirmed = await solved(
      term({
        rooms,
        confirmed: [{ id: 'P1', value: 'M' }],
        candidates: queue(['P2', 'Ž'], ['P3', 'Ž'], ['P4', 'Ž']),
      }),
    );
    expect(p1Confirmed.roomValues).toEqual({ R1: 'M' });
    expect(p1Confirmed.suitable).toEqual([]);
    expect(reasons(p1Confirmed)).toEqual({ P2: 'B', P3: 'B', P4: 'B' });
  });

  it('Př. 5: leaves out who needs a manual determination, and counts a confirmed one', async () => {
    const rooms = [room('R1', 2), room('R2', 2)];
    const result = await solved(
      term({
        rooms,
        candidates: queue(['P1', 'Ž'], ['P2', null], ['P3', 'M'], ['P4', null]),
      }),
    );
    expect(result.suitable).toEqual(['P1', 'P3']);
    expect(reasons(result)).toEqual({ P2: 'R', P4: 'R' });

    const determined = await solved(
      term({
        rooms,
        confirmed: [{ id: 'P4', value: 'M' }],
        candidates: queue(['P1', 'Ž'], ['P2', 'Ž'], ['P3', 'M']),
      }),
    );
    expect(determined.suitable).toEqual(['P1', 'P2', 'P3']);
    expect(determined.rooms.P4).toBe(determined.rooms.P3);
  });

  it('Př. 6: a determined earlier candidate comes first, unless the later one is confirmed', async () => {
    const rooms = [room('R1', 1)];
    const open = await solved(
      term({ rooms, candidates: queue(['P1', 'Ž'], ['P2', 'Ž']) }),
    );
    expect(open.suitable).toEqual(['P1']);
    expect(reasons(open)).toEqual({ P2: 'A' });

    const p2Confirmed = await solved(
      term({
        rooms,
        confirmed: [{ id: 'P2', value: 'Ž' }],
        candidates: queue(['P1', 'Ž']),
      }),
    );
    expect(p2Confirmed.rooms.P2).toBe('R1');
    expect(reasons(p2Confirmed)).toEqual({ P1: 'A' });
  });

  it('Př. 8: a term without capacity gives everyone reason N', async () => {
    const result = await solved(term({ candidates: queue(['P1', 'Ž']) }));
    expect(result.suitable).toEqual([]);
    expect(reasons(result)).toEqual({ P1: 'N' });
  });

  it('Př. 9: follows a manual change of position', async () => {
    const result = await solved(
      term({
        rooms: [room('R1', 2)],
        candidates: queue(['P1', 'Ž'], ['P3', 'Ž'], ['P2', 'Ž']),
      }),
    );
    expect(result.suitable).toEqual(['P1', 'P3']);
    expect(reasons(result)).toEqual({ P2: 'A' });
  });

  it('Př. 11: reports confirmed participants who no longer fit, and passes once a bed is added', async () => {
    const confirmed = [
      { id: 'Z1', value: 'Ž' },
      { id: 'Z2', value: 'Ž' },
      { id: 'Z3', value: 'Ž' },
      { id: 'M1', value: 'M' },
    ];
    const conflict = await solveAssignment(
      term({ rooms: [room('R1', 2), room('R2', 2)], confirmed }),
    );
    expect(conflict).toMatchObject({
      status: 'infeasible',
      constraint: 'homogeneity',
    });
    expect(
      conflict.status === 'infeasible' && conflict.conflicting,
    ).toHaveLength(1);

    const fixed = await solved(
      term({ rooms: [room('R1', 2, 1), room('R2', 2)], confirmed }),
    );
    expect(fixed.roomValues).toEqual({ R1: 'Ž', R2: 'M' });
  });

  it('decides by capacity and position alone without a hard attribute', async () => {
    const result = await solved(
      term({
        hasHardAttribute: false,
        rooms: [room('R1', 2)],
        candidates: queue(['P1', null], ['P2', null], ['P3', null]),
      }),
    );
    expect(result.suitable).toEqual(['P1', 'P2']);
    expect(reasons(result)).toEqual({ P3: 'A' });
  });

  it('reports the confirmed participants when they outnumber the beds', async () => {
    const input = term({
      rooms: [room('R1', 1)],
      confirmed: [
        { id: 'A', value: 'Ž' },
        { id: 'B', value: 'Ž' },
      ],
    });

    // Phase 1 names everyone of the value that no longer fits; phase 2 the
    // fewest who would have to stay out.
    expect(await solveAssignment(input, { phase: 1 })).toMatchObject({
      status: 'infeasible',
      constraint: 'capacity',
      conflicting: ['A', 'B'],
    });
    const phaseTwo = await solveAssignment(input, { phase: 2 });
    expect(phaseTwo).toMatchObject({
      status: 'infeasible',
      constraint: 'capacity',
    });
    expect(
      phaseTwo.status === 'infeasible' ? phaseTwo.conflicting : [],
    ).toHaveLength(1);
  });

  it.each([1, 2] as const)(
    'reports a confirmed participant without an effective value instead of placing them (phase %i)',
    async (phase) => {
      const result = await solveAssignment(
        term({
          rooms: [room('R1', 2), room('R2', 2)],
          confirmed: [
            { id: 'A', value: 'Ž' },
            { id: 'B', value: null },
          ],
          candidates: queue(['P1', 'Ž']),
        }),
        { phase },
      );
      expect(result).toMatchObject({
        status: 'infeasible',
        constraint: 'homogeneity',
        conflicting: ['B'],
      });
    },
  );

  it.each([
    ['has no bed', [room('R1', 0), room('R2', 2)]],
    ['is no longer available', [room('R2', 2)]],
  ])(
    'never moves a confirmed participant whose room %s (phase 2)',
    async (_, rooms) => {
      const result = await solveAssignment(
        term({
          rooms,
          confirmed: [{ id: 'A', value: 'Ž', roomId: 'R1' }],
          candidates: queue(['P1', 'Ž']),
        }),
        { phase: 2 },
      );
      expect(result).toMatchObject({
        status: 'infeasible',
        conflicting: ['A'],
      });
    },
  );

  it('groups by the higher-ranked soft attribute first in the room proposal (phase 2)', async () => {
    const result = await solveAssignment(
      term({
        hasHardAttribute: false,
        softAttributes: ['age', 'town'],
        rooms: [room('R1', 2), room('R2', 2)],
        candidates: [
          {
            id: 'A',
            value: null,
            position: 0,
            softValues: { age: 'young', town: 'X' },
          },
          {
            id: 'B',
            value: null,
            position: 1,
            softValues: { age: 'old', town: 'X' },
          },
          {
            id: 'C',
            value: null,
            position: 2,
            softValues: { age: 'young', town: 'Y' },
          },
          {
            id: 'D',
            value: null,
            position: 3,
            softValues: { age: 'old', town: 'Y' },
          },
        ],
      }),
      { phase: 2 },
    );
    if (result.status !== 'solved') throw new Error(result.status);
    expect(result.stats.complete).toBe(true);
    expect(result.rooms.A).toBe(result.rooms.C);
    expect(result.rooms.B).toBe(result.rooms.D);
  });

  it('gives up with a timeout instead of running past the limit', async () => {
    const result = await solveAssignment(
      term({ rooms: [room('R1', 2)], candidates: queue(['P1', 'Ž']) }),
      { timeLimitMs: 0 },
    );
    expect(result.status).toBe('timeout');
  });
});
