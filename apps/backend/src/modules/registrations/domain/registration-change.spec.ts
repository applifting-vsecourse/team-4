import { RegistrationTermResult } from '@/modules/registrations/domain/registration';
import {
  ChangeProposal,
  ChangeSubject,
  EventTermInfo,
  InvalidChangeError,
  planChange,
} from '@/modules/registrations/domain/registration-change';
import {
  NO_NEEDS,
  RegistrationNeeds,
} from '@/modules/registrations/domain/registration-needs';

// "Today" is 2026-10-26; with a 14-day threshold a term starting on or before
// 2026-11-09 needs approval.
const NOW = new Date('2026-10-26T10:00:00Z');

const term = (
  id: string,
  startDate: string,
  status: RegistrationTermResult['status'] = 'confirmed',
  priceMinor = 240_000,
): RegistrationTermResult => ({
  termId: id,
  label: id.toUpperCase(),
  startDate,
  endDate: startDate,
  priceMinor,
  status,
});

const subject = (
  terms: RegistrationTermResult[],
  paidMinor = 480_000,
): ChangeSubject => ({
  firstName: 'Jana',
  lastName: 'Nováková',
  phone: '+420604123456',
  needs: NO_NEEDS,
  gender: null,
  genderOther: null,
  paidMinor,
  terms,
});

const info = (
  id: string,
  startDate: string,
  priceMinor = 290_000,
): EventTermInfo => ({
  id,
  label: id.toUpperCase(),
  startDate,
  endDate: startDate,
  priceMinor,
});

const events = (...terms: EventTermInfo[]): Map<string, EventTermInfo> =>
  new Map(terms.map((t) => [t.id, t]));

const proposal = (changes: Partial<ChangeProposal>): ChangeProposal => ({
  moves: [],
  cancelledTermIds: [],
  ...changes,
});

const T1 = term('t1', '2026-11-06'); // inside the threshold
const T2 = term('t2', '2026-11-20');
const PLAIN = subject([T1, T2]);

describe('planChange', () => {
  it('needs no approval without a threshold', () => {
    const plan = planChange(
      PLAIN,
      proposal({ phone: '+420731987654' }),
      events(),
      null,
      NOW,
    );
    expect(plan.requiresApproval).toBe(false);
  });

  it('judges a data change by every active term', () => {
    const plan = planChange(
      PLAIN,
      proposal({ phone: '+420731987654' }),
      events(),
      14,
      NOW,
    );
    expect(plan.requiresApproval).toBe(true);
    expect(plan.kinds).toEqual(['data']);
    expect(plan.summary.values).toEqual([
      { field: 'phone', original: '+420604123456', proposed: '+420731987654' },
    ]);
    expect(plan.summary.terms.map((t) => t.termId)).toEqual(['t1', 't2']);
  });

  it('changes the gender answer as data, judged by every active term', () => {
    const plan = planChange(
      PLAIN,
      proposal({ gender: 'other' }),
      events(),
      14,
      NOW,
    );
    expect(plan.requiresApproval).toBe(true);
    expect(plan.kinds).toEqual(['data']);
    expect(plan.summary.values).toEqual([
      { field: 'gender', original: null, proposed: 'other' },
    ]);
    expect(plan.summary.terms.map((t) => t.termId)).toEqual(['t1', 't2']);
  });

  it('clears the gender answer back to not answered', () => {
    const plan = planChange(
      { ...PLAIN, gender: 'undisclosed' },
      proposal({ gender: null }),
      events(),
      null,
      NOW,
    );
    expect(plan.summary.values).toEqual([
      { field: 'gender', original: 'undisclosed', proposed: null },
    ]);
  });

  it('adds the own words to "Jiná odpověď"', () => {
    const plan = planChange(
      PLAIN,
      proposal({ gender: 'other', genderOther: 'nebinární' }),
      events(),
      null,
      NOW,
    );
    expect(plan.summary.values).toEqual([
      { field: 'gender', original: null, proposed: 'other' },
      { field: 'genderOther', original: null, proposed: 'nebinární' },
    ]);
  });

  it('changes only the own words of a kept "Jiná odpověď"', () => {
    const plan = planChange(
      { ...PLAIN, gender: 'other', genderOther: 'nebinární' },
      proposal({ genderOther: 'agender' }),
      events(),
      null,
      NOW,
    );
    expect(plan.summary.values).toEqual([
      { field: 'genderOther', original: 'nebinární', proposed: 'agender' },
    ]);
  });

  it('drops the own words with another answer', () => {
    const plan = planChange(
      { ...PLAIN, gender: 'other', genderOther: 'nebinární' },
      proposal({ gender: 'undisclosed' }),
      events(),
      null,
      NOW,
    );
    expect(plan.summary.values).toEqual([
      { field: 'gender', original: 'other', proposed: 'undisclosed' },
      { field: 'genderOther', original: 'nebinární', proposed: null },
    ]);
  });

  it.each([
    ['with another answer', { gender: 'female' as const }],
    ['beside a stored answer other than "Jiná odpověď"', {}],
  ])('refuses own words %s', (_, change) => {
    expect(() =>
      planChange(
        { ...PLAIN, gender: 'male' },
        proposal({ ...change, genderOther: 'nebinární' }),
        events(),
        null,
        NOW,
      ),
    ).toThrow(new InvalidChangeError('gender_other_mismatch'));
  });

  it('ignores a gender answer left as it is', () => {
    expect(() =>
      planChange(PLAIN, proposal({ gender: null }), events(), 14, NOW),
    ).toThrow(new InvalidChangeError('no_change'));
  });

  it('judges a change of the needs by every active term', () => {
    const needs: RegistrationNeeds = {
      ...NO_NEEDS,
      transport: 'shared',
      diet: ['vegan', 'vegetarian'],
      health: '  Astma  ',
    };
    const plan = planChange(PLAIN, proposal({ needs }), events(), 14, NOW);
    expect(plan.requiresApproval).toBe(true);
    expect(plan.kinds).toEqual(['data']);
    expect(plan.summary.values).toEqual([]);
    expect(plan.summary.needs).toEqual({
      original: NO_NEEDS,
      proposed: {
        ...needs,
        diet: ['vegetarian', 'vegan'],
        health: 'Astma',
      },
    });
    expect(plan.summary.terms.map((t) => t.termId)).toEqual(['t1', 't2']);
  });

  it('takes the same needs as no change, and clearing them as one', () => {
    const filled = { ...PLAIN, needs: { ...NO_NEEDS, dietNote: 'Bez ořechů' } };
    expect(() =>
      planChange(
        filled,
        proposal({ needs: { ...NO_NEEDS, dietNote: ' Bez ořechů ' } }),
        events(),
        null,
        NOW,
      ),
    ).toThrow(new InvalidChangeError('no_change'));
    const cleared = planChange(
      filled,
      proposal({ needs: NO_NEEDS }),
      events(),
      null,
      NOW,
    );
    expect(cleared.summary.needs?.proposed).toEqual(NO_NEEDS);
    expect(cleared.requiresApproval).toBe(false);
  });

  it('ignores a field left as it is', () => {
    expect(() =>
      planChange(PLAIN, proposal({ lastName: 'Nováková' }), events(), 14, NOW),
    ).toThrow(new InvalidChangeError('no_change'));
  });

  it('judges a move by the old and the new term', () => {
    const later = subject([T2]);
    const to = events(info('t3', '2026-12-04'));
    const move = (toId: string, from = 't2') =>
      proposal({
        moves: [{ fromTermId: from, toTermId: toId, acceptRelease: false }],
      });

    expect(planChange(later, move('t3'), to, 14, NOW).requiresApproval).toBe(
      false,
    );
    // The new term is inside the threshold.
    expect(
      planChange(later, move('t4'), events(info('t4', '2026-11-08')), 14, NOW)
        .requiresApproval,
    ).toBe(true);
    // The old term is inside the threshold.
    expect(
      planChange(subject([T1]), move('t3', 't1'), to, 14, NOW).requiresApproval,
    ).toBe(true);
  });

  it('judges a cancellation by the cancelled terms only', () => {
    const cancelLater = planChange(
      PLAIN,
      proposal({ cancelledTermIds: ['t2'] }),
      events(),
      14,
      NOW,
    );
    expect(cancelLater.requiresApproval).toBe(false);
    expect(cancelLater.kinds).toEqual(['cancel_terms']);

    const cancelAll = planChange(
      PLAIN,
      proposal({ cancelledTermIds: ['t1', 't2'] }),
      events(),
      14,
      NOW,
    );
    expect(cancelAll.requiresApproval).toBe(true);
    expect(cancelAll.kinds).toEqual(['cancel_all']);
  });

  it('counts the boundary day and the days after the start', () => {
    const on = subject([term('a', '2026-11-09')]);
    const after = subject([term('b', '2026-10-20')]);
    const cancel = (id: string) => proposal({ cancelledTermIds: [id] });
    expect(
      planChange(on, cancel('a'), events(), 14, NOW).requiresApproval,
    ).toBe(true);
    expect(
      planChange(after, cancel('b'), events(), 14, NOW).requiresApproval,
    ).toBe(true);
    expect(
      planChange(
        subject([term('c', '2026-11-10')]),
        cancel('c'),
        events(),
        14,
        NOW,
      ).requiresApproval,
    ).toBe(false);
  });

  it('shows price and balance, an overpayment included, without a fee', () => {
    const plan = planChange(
      PLAIN,
      proposal({ cancelledTermIds: ['t2'] }),
      events(),
      null,
      NOW,
    );
    expect(plan.summary.original).toEqual({
      dueMinor: 480_000,
      paidMinor: 480_000,
      balanceMinor: 0,
    });
    expect(plan.summary.proposed).toEqual({
      dueMinor: 240_000,
      paidMinor: 480_000,
      balanceMinor: -240_000,
    });
  });

  it('moves onto the new term at its price, waiting for the organizer (S3-01)', () => {
    const plan = planChange(
      subject([T2]),
      proposal({
        moves: [{ fromTermId: 't2', toTermId: 't3', acceptRelease: false }],
      }),
      events(info('t3', '2026-12-04')),
      null,
      NOW,
    );
    expect(plan.moves).toEqual([
      {
        fromTermId: 't2',
        toTermId: 't3',
        acceptRelease: false,
        resultStatus: 'pending',
        requiresReleaseConsent: true,
      },
    ]);
    expect(
      plan.summary.terms.map((t) => [t.termId, t.original, t.proposed]),
    ).toEqual([
      ['t2', 'confirmed', 'cancelled'],
      ['t3', null, 'pending'],
    ]);
    // The confirmed place is given up and nothing new is due yet.
    expect(plan.summary.proposed.dueMinor).toBe(0);
  });

  it.each(['pending', 'waitlisted'] as const)(
    'needs no consent to move a %s place',
    (status) => {
      const plan = planChange(
        subject([term('t2', '2026-11-20', status)]),
        proposal({
          moves: [{ fromTermId: 't2', toTermId: 't3', acceptRelease: false }],
        }),
        events(info('t3', '2026-12-04')),
        null,
        NOW,
      );
      expect(plan.moves[0]).toMatchObject({
        resultStatus: 'pending',
        requiresReleaseConsent: false,
      });
    },
  );

  it('brings a term released earlier back at today’s price', () => {
    const plan = planChange(
      subject([T2, term('t3', '2026-12-04', 'cancelled', 100_000)]),
      proposal({
        moves: [{ fromTermId: 't2', toTermId: 't3', acceptRelease: false }],
      }),
      events(info('t3', '2026-12-04')),
      null,
      NOW,
    );
    expect(plan.summary.terms.find((t) => t.termId === 't3')).toMatchObject({
      original: 'cancelled',
      proposed: 'pending',
      priceMinor: 290_000,
    });
  });

  it.each([
    [
      'a term that is not active',
      proposal({ cancelledTermIds: ['nope'] }),
      'term_not_active',
    ],
    [
      'a target of another event',
      proposal({
        moves: [{ fromTermId: 't2', toTermId: 'x', acceptRelease: false }],
      }),
      'term_unknown',
    ],
    [
      'a move onto a term already held',
      proposal({
        moves: [{ fromTermId: 't2', toTermId: 't1', acceptRelease: false }],
      }),
      'term_conflict',
    ],
    [
      'a term both moved and cancelled',
      proposal({
        cancelledTermIds: ['t2'],
        moves: [{ fromTermId: 't2', toTermId: 't3', acceptRelease: false }],
      }),
      'term_conflict',
    ],
  ])('refuses %s', (_name, bad, code) => {
    expect(() =>
      planChange(
        PLAIN,
        bad,
        events(info('t3', '2026-12-04'), info('t1', '2026-11-06')),
        null,
        NOW,
      ),
    ).toThrow(new InvalidChangeError(code as 'term_conflict'));
  });

  it('refuses any change of a cancelled registration', () => {
    expect(() =>
      planChange(
        subject([term('t1', '2026-11-06', 'cancelled')]),
        proposal({ phone: '+420731987654' }),
        events(),
        null,
        NOW,
      ),
    ).toThrow(new InvalidChangeError('registration_cancelled'));
  });
});
