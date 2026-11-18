import {
  changeTerms,
  decisionTerms,
  newestFirst,
} from '@/modules/participant-notifications/domain/participant-notification';
import { PlannedTerm } from '@/modules/registrations/domain/registration-change';

const term = (termId: string, label: string) => ({
  termId,
  label,
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  priceMinor: 100_000,
});

const planned = (
  label: string,
  original: PlannedTerm['original'],
  proposed: PlannedTerm['proposed'],
): PlannedTerm => ({ ...term(label, label), original, proposed });

describe('decisionTerms', () => {
  it('lists every term the decision changed, in its new state', () => {
    expect(
      decisionTerms({
        decided: [
          { termId: 'a', from: 'pending', to: 'confirmed' },
          { termId: 'b', from: 'pending', to: 'waitlisted' },
        ],
        terms: [
          { ...term('a', '1. turnus'), status: 'confirmed' },
          { ...term('b', '2. turnus'), status: 'waitlisted' },
          { ...term('c', '3. turnus'), status: 'pending' },
        ],
      }),
    ).toEqual([
      {
        label: '1. turnus',
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        status: 'confirmed',
      },
      {
        label: '2. turnus',
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        status: 'waitlisted',
      },
    ]);
  });
});

describe('changeTerms', () => {
  const summary = {
    terms: [
      planned('kept', 'confirmed', null),
      planned('same', 'pending', 'pending'),
      planned('released', 'confirmed', 'cancelled'),
      planned('added', null, 'pending'),
    ],
  };

  it('gives an approved request the proposed states', () => {
    expect(
      changeTerms(summary, 'approved').map((t) => [t.label, t.status]),
    ).toEqual([
      ['released', 'cancelled'],
      ['added', 'pending'],
    ]);
  });

  it('keeps the states of a rejected request and omits terms it would add', () => {
    expect(
      changeTerms(summary, 'rejected').map((t) => [t.label, t.status]),
    ).toEqual([['released', 'confirmed']]);
  });

  it('has no terms for a request that changes only contact details', () => {
    expect(changeTerms({ terms: [] }, 'approved')).toEqual([]);
  });
});

describe('newestFirst', () => {
  it('orders by the saved time, then by id, newest first', () => {
    const items = [
      { id: '01', at: new Date('2026-11-01T10:00:00Z') },
      { id: '03', at: new Date('2026-11-02T10:00:00Z') },
      { id: '02', at: new Date('2026-11-01T10:00:00Z') },
    ];
    expect([...items].sort(newestFirst).map((item) => item.id)).toEqual([
      '03',
      '02',
      '01',
    ]);
  });
});
