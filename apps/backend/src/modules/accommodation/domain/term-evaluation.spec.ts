import { NO_RULES } from '@/modules/accommodation/domain/evaluation-input';
import {
  buildTermView,
  evaluationStatus,
  RunOutcome,
  shownProposal,
  TermEvaluationView,
  TermPerson,
} from '@/modules/accommodation/domain/term-evaluation';
import { SolverResult } from '@/modules/accommodation/solver/solver.types';

const GENDER = {
  hardAttribute: {
    attribute: 'gender',
    nonDeterminingValues: ['other', 'undisclosed'],
  },
  softAttributes: [],
};

const stats = { millis: 1, solves: 1, complete: true };

const at = (minute: number): Date =>
  new Date(`2027-03-01T10:${String(minute).padStart(2, '0')}:00Z`);

const person = (
  id: string,
  status: TermPerson['status'],
  answer: string | null = null,
  minute = 0,
): TermPerson => ({
  registrationId: id,
  firstName: id,
  lastName: 'Nováková',
  receivedAt: at(minute),
  status,
  answer,
  manualValue: null,
});

const run = (
  id: string,
  result: SolverResult | null,
  { inputVersion = 1, minute = 30 } = {},
): RunOutcome => ({
  id,
  status: result?.status ?? 'failed',
  inputVersion,
  finishedAt: at(minute),
  result,
});

const solved = (
  suitable: string[],
  unplaced: { id: string; reason: 'A' | 'B' | 'C' | 'N' | 'R' }[],
): SolverResult => ({
  status: 'solved',
  suitable,
  unplaced,
  rooms: {},
  roomValues: {},
  beds: { baseUsed: 2, extraUsed: 1, base: 4, extra: 1 },
  stats,
});

const view = (
  overrides: Partial<Parameters<typeof buildTermView>[0]> = {},
): TermEvaluationView =>
  buildTermView({
    rules: GENDER,
    rooms: [{ roomId: 'r1', label: 'R1', baseBeds: 4, extraBeds: 1 }],
    people: [],
    storedOrder: null,
    inputVersion: 1,
    isRunning: false,
    latest: null,
    lastSolved: null,
    lastInfeasible: null,
    ...overrides,
  });

describe('evaluationStatus', () => {
  it.each([
    [false, null, 'none'],
    [true, null, 'running'],
    [false, { status: 'solved', inputVersion: 3 }, 'current'],
    [false, { status: 'solved', inputVersion: 2 }, 'stale'],
    [false, { status: 'infeasible', inputVersion: 3 }, 'infeasible'],
    [false, { status: 'infeasible', inputVersion: 2 }, 'stale'],
    [false, { status: 'failed', inputVersion: 3 }, 'failed'],
    [false, { status: 'timeout', inputVersion: 3 }, 'timeout'],
    [true, { status: 'solved', inputVersion: 3 }, 'running'],
  ] as const)('running %s, latest %o → %s', (isRunning, latest, status) => {
    expect(evaluationStatus(isRunning, latest, 3)).toBe(status);
  });
});

describe('shownProposal', () => {
  const ok = run('ok', solved([], []), { minute: 10 });

  it('keeps the last solved proposal after a failed run', () => {
    expect(shownProposal(run('x', null, { minute: 20 }), ok, null)).toBe(ok);
  });

  it('shows no proposal after a conflict', () => {
    const conflict = run(
      'c',
      { status: 'infeasible', conflicting: [], constraint: 'capacity', stats },
      { minute: 20 },
    );
    expect(shownProposal(conflict, ok, conflict)).toBeNull();
    // A later failure does not bring back the proposal from before the conflict.
    expect(
      shownProposal(run('x', null, { minute: 25 }), ok, conflict),
    ).toBeNull();
  });

  it('shows nothing before the first run', () => {
    expect(shownProposal(null, null, null)).toBeNull();
  });
});

describe('buildTermView', () => {
  it('orders the unconfirmed by receipt and splits the queues by effective value', () => {
    const result = view({
      people: [
        person('M1', 'pending', 'male', 2),
        person('Z1', 'pending', 'female', 1),
        person('C1', 'confirmed', 'female'),
        person('U1', 'waitlisted', 'undisclosed', 3),
      ],
    });

    expect(
      result.order.map((entry) => [entry.registrationId, entry.position]),
    ).toEqual([
      ['Z1', 1],
      ['M1', 2],
      ['U1', 3],
    ]);
    expect(result.queues).toEqual([
      { value: 'female', pending: 1, waitlisted: 0 },
      { value: 'male', pending: 1, waitlisted: 0 },
    ]);
    // Without an effective value U1 is in no queue and waits for a determination.
    expect(result.manualCount).toBe(1);
    expect(result.order[2]).toMatchObject({ effectiveValue: null });
    expect(result.capacity).toEqual({
      baseBeds: 4,
      extraBeds: 1,
      confirmed: 1,
      pending: 2,
      waitlisted: 1,
    });
    expect(result.status).toBe('none');
  });

  it('uses a determination only while it was made on the current answer', () => {
    const result = view({
      people: [
        {
          ...person('A', 'pending', 'other'),
          manualValue: { value: 'female', basedOnAnswer: 'other' },
        },
        {
          ...person('B', 'pending', 'female', 1),
          manualValue: { value: 'male', basedOnAnswer: 'other' },
        },
      ],
    });
    expect(
      result.order.map(({ determinedValue, effectiveValue }) => [
        determinedValue,
        effectiveValue,
      ]),
    ).toEqual([
      ['female', 'female'],
      [null, 'female'],
    ]);
  });

  it('puts everyone into one queue without a hard attribute', () => {
    const result = view({
      rules: NO_RULES,
      people: [
        person('A', 'pending', 'undisclosed'),
        person('B', 'waitlisted', null, 1),
      ],
    });
    expect(result.queues).toEqual([{ value: null, pending: 1, waitlisted: 1 }]);
    expect(result.manualCount).toBe(0);
    expect(result.order.every((entry) => entry.effectiveValue === null)).toBe(
      true,
    );
  });

  it('adds the results of the shown proposal and marks it stale after a change', () => {
    const proposal = run(
      'p',
      solved(
        ['Z1'],
        [
          { id: 'M1', reason: 'A' },
          { id: 'U1', reason: 'R' },
        ],
      ),
    );
    const people = [
      person('Z1', 'pending', 'female', 1),
      person('M1', 'pending', 'male', 2),
      person('U1', 'waitlisted', 'undisclosed', 3),
      // Registered after the run: it has no result yet.
      person('N1', 'pending', 'female', 4),
    ];

    const current = view({ people, latest: proposal, lastSolved: proposal });
    expect(current.status).toBe('current');
    expect(current.proposalRun).toMatchObject({ id: 'p', isCurrent: true });
    expect(current.order.map(({ result, reason }) => [result, reason])).toEqual(
      [
        ['suitable', undefined],
        ['unsuitable', 'A'],
        ['manual', 'R'],
        [undefined, undefined],
      ],
    );
    expect(current.queues).toEqual([
      {
        value: 'female',
        pending: 2,
        waitlisted: 0,
        suitable: 1,
        unsuitable: 0,
      },
      { value: 'male', pending: 1, waitlisted: 0, suitable: 0, unsuitable: 1 },
    ]);
    expect(current.capacity.proposal).toEqual({
      suitable: 1,
      unsuitable: 1,
      manual: 1,
      baseUsed: 2,
      extraUsed: 1,
    });

    const stale = view({
      people,
      latest: proposal,
      lastSolved: proposal,
      inputVersion: 2,
    });
    expect(stale.status).toBe('stale');
    expect(stale.proposalRun).toMatchObject({ isCurrent: false });
  });

  it('names the confirmed participants of a current conflict', () => {
    const conflict = run('c', {
      status: 'infeasible',
      conflicting: ['C1'],
      constraint: 'homogeneity',
      stats,
    });
    const result = view({
      people: [person('C1', 'confirmed', 'male')],
      latest: conflict,
      lastInfeasible: conflict,
    });
    expect(result.status).toBe('infeasible');
    expect(result.conflict).toEqual({
      constraint: 'homogeneity',
      confirmed: [
        { registrationId: 'C1', firstName: 'C1', lastName: 'Nováková' },
      ],
    });
    expect(result.proposalRun).toBeNull();
    expect(result.capacity.proposal).toBeUndefined();
  });
});
