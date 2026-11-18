import {
  byName,
  invalidWishes,
  MAX_ROOMMATE_WISHES,
} from '@/modules/registrations/domain/roommate-wish';

describe('roommate wishes (S4-05)', () => {
  const candidates = new Set(['anna', 'eva']);
  const stored = new Set(['petr']);

  it('accepts candidates, a stored wish and an empty list', () => {
    expect(invalidWishes('jana', [], candidates, stored)).toBeNull();
    expect(
      invalidWishes('jana', ['anna', 'petr'], candidates, stored),
    ).toBeNull();
  });

  it.each([
    [['anna', 'anna'], 'Každého spolubydlícího lze vybrat jen jednou.'],
    [['jana'], 'Sám sebe vybrat nelze.'],
    [['cizí'], 'Vyberte potvrzené účastníky této akce.'],
  ])('refuses %j', (ids, message) => {
    expect(invalidWishes('jana', ids, candidates, stored)).toBe(message);
  });

  it('refuses more than the limit', () => {
    const many = Array.from(
      { length: MAX_ROOMMATE_WISHES + 1 },
      (_, i) => `p${i}`,
    );
    expect(invalidWishes('jana', many, new Set(many), stored)).toMatch(
      /nejvýš/,
    );
  });

  it('orders by name in Czech, then by id', () => {
    const people = [
      { registrationId: '2', name: 'Čermák' },
      { registrationId: '1', name: 'Dvořák' },
      { registrationId: '3', name: 'Cibulka' },
      { registrationId: '0', name: 'Čermák' },
    ];
    expect([...people].sort(byName).map((p) => p.registrationId)).toEqual([
      '3',
      '0',
      '2',
      '1',
    ]);
  });
});
