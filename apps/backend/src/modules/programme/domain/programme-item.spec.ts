import { isCalendarDate, isWithinTerm } from './programme-item';

describe('isCalendarDate', () => {
  it('accepts real dates only', () => {
    expect(isCalendarDate('2026-11-07')).toBe(true);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('7. 11. 2026')).toBe(false);
  });
});

describe('isWithinTerm', () => {
  const term = { startDate: '2026-11-06', endDate: '2026-11-08' };

  it('includes both ends of the term', () => {
    expect(isWithinTerm('2026-11-06', term)).toBe(true);
    expect(isWithinTerm('2026-11-08', term)).toBe(true);
  });

  it('rejects days outside the term', () => {
    expect(isWithinTerm('2026-11-05', term)).toBe(false);
    expect(isWithinTerm('2026-11-09', term)).toBe(false);
  });
});
