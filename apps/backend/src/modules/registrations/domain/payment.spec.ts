import {
  isFutureDate,
  todayInPrague,
} from '@/modules/registrations/domain/payment';

describe('todayInPrague', () => {
  it('is already the next day just after Prague midnight', () => {
    // 22:30 UTC on 30 June is 00:30 on 1 July in Prague (UTC+2).
    expect(todayInPrague(new Date('2027-06-30T22:30:00Z'))).toBe('2027-07-01');
  });

  it('is still the same day shortly before Prague midnight', () => {
    expect(todayInPrague(new Date('2027-06-30T21:30:00Z'))).toBe('2027-06-30');
  });

  it('follows winter time', () => {
    expect(todayInPrague(new Date('2027-01-15T23:30:00Z'))).toBe('2027-01-16');
  });
});

describe('isFutureDate', () => {
  const now = new Date('2027-06-30T22:30:00Z');

  it('accepts today and the past', () => {
    expect(isFutureDate('2027-07-01', now)).toBe(false);
    expect(isFutureDate('2027-06-30', now)).toBe(false);
  });

  it('rejects tomorrow', () => {
    expect(isFutureDate('2027-07-02', now)).toBe(true);
  });
});
