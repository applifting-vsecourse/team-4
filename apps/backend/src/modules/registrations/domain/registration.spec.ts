import {
  amountDueMinor,
  decideParticipation,
  normalizeEmail,
  paymentReminderAt,
  RegistrationInput,
  RegistrationResultModel,
  submissionHash,
} from '@/modules/registrations/domain/registration';

const input: RegistrationInput = {
  submissionKey: '0b8f3b36-6a2e-4c55-9d43-0d1d0e0e0e01',
  firstName: 'Jana',
  lastName: 'Nováková',
  email: 'Jana@Example.com',
  phone: '+420777123456',
  termIds: ['b', 'a'],
};

describe('decideParticipation', () => {
  it('confirms while a bed is free and waitlists otherwise', () => {
    expect(decideParticipation({ capacity: 2, confirmed: 1 })).toBe(
      'confirmed',
    );
    expect(decideParticipation({ capacity: 2, confirmed: 2 })).toBe(
      'waitlisted',
    );
    expect(decideParticipation({ capacity: 0, confirmed: 0 })).toBe(
      'waitlisted',
    );
  });

  it('waitlists in a term already over capacity', () => {
    expect(decideParticipation({ capacity: 1, confirmed: 3 })).toBe(
      'waitlisted',
    );
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Jana@Example.COM ')).toBe('jana@example.com');
  });
});

describe('submissionHash', () => {
  it('ignores the term order and the e-mail case', () => {
    expect(
      submissionHash({
        ...input,
        termIds: ['a', 'b'],
        email: 'jana@example.com',
      }),
    ).toBe(submissionHash(input));
  });

  it.each([
    ['first name', { firstName: 'Jan' }],
    ['last name', { lastName: 'Novák' }],
    ['e-mail', { email: 'jana2@example.com' }],
    ['phone', { phone: '+420777123457' }],
    ['terms', { termIds: ['a'] }],
  ])('changes with the %s', (_, change) => {
    expect(submissionHash({ ...input, ...change })).not.toBe(
      submissionHash(input),
    );
  });

  it('does not depend on the key, which is checked separately', () => {
    expect(submissionHash({ ...input, submissionKey: 'other' })).toBe(
      submissionHash(input),
    );
  });
});

describe('RegistrationResultModel', () => {
  it('sums the selected terms, waitlisted ones included, exactly in haléře', () => {
    const term = { label: 'T', startDate: '2027-07-01', endDate: '2027-07-07' };
    const result = new RegistrationResultModel(
      'id',
      new Date(),
      'Jana',
      'Nováková',
      'jana@example.com',
      '+420777123456',
      [
        { ...term, termId: 'a', priceMinor: 450_050, status: 'confirmed' },
        { ...term, termId: 'b', priceMinor: 0, status: 'confirmed' },
        { ...term, termId: 'c', priceMinor: 1, status: 'waitlisted' },
      ],
      '1001',
      { prefix: null, number: '123456789', bankCode: '0800' },
      new Date('2027-07-11T10:00:00Z'),
      { name: 'Tábor', location: 'Jizerka' },
    );
    expect(result.selectedPriceMinor).toBe(450_051);
    expect(result.amountDueMinor).toBe(450_050);
    expect(result.paymentInstructions).toMatchObject({
      amountMinor: 450_050,
      variableSymbol: '1001',
    });
  });

  it('gives no payment instructions at zero obligation', () => {
    const term = { label: 'T', startDate: '2027-07-01', endDate: '2027-07-07' };
    const result = new RegistrationResultModel(
      'id',
      new Date(),
      'Jana',
      'Nováková',
      'jana@example.com',
      '+420777123456',
      [
        { ...term, termId: 'a', priceMinor: 2_000, status: 'waitlisted' },
        { ...term, termId: 'b', priceMinor: 0, status: 'confirmed' },
      ],
      '1002',
      { prefix: null, number: '123456789', bankCode: '0800' },
      null,
      { name: 'Tábor', location: 'Jizerka' },
    );
    expect(result.amountDueMinor).toBe(0);
    expect(result.paymentInstructions).toBeNull();
  });
});

describe('amountDueMinor', () => {
  it('counts confirmed terms only', () => {
    expect(
      amountDueMinor([
        { status: 'confirmed', priceMinor: 1_000_00 },
        { status: 'waitlisted', priceMinor: 2_000_00 },
      ]),
    ).toBe(100_000);
  });

  it('is zero for waitlisted-only, free or no terms', () => {
    expect(amountDueMinor([{ status: 'waitlisted', priceMinor: 5 }])).toBe(0);
    expect(amountDueMinor([{ status: 'confirmed', priceMinor: 0 }])).toBe(0);
    expect(amountDueMinor([])).toBe(0);
  });
});

describe('paymentReminderAt', () => {
  it('adds calendar days at the same Prague time within one offset', () => {
    // 12:00 Prague (CEST, UTC+2) on 1 July + 10 days
    expect(
      paymentReminderAt(new Date('2027-07-01T10:00:00Z'), 10).toISOString(),
    ).toBe('2027-07-11T10:00:00.000Z');
  });

  it('keeps the wall-clock time across the spring DST change', () => {
    // 27 Mar 2027 12:00 CET (UTC+1) -> 3 Apr 2027 12:00 CEST (UTC+2)
    expect(
      paymentReminderAt(new Date('2027-03-27T11:00:00Z'), 7).toISOString(),
    ).toBe('2027-04-03T10:00:00.000Z');
  });

  it('keeps the wall-clock time across the autumn DST change', () => {
    // 23 Oct 2027 12:00 CEST (UTC+2) -> 30 Oct 2027 12:00 CET (UTC+1)
    expect(
      paymentReminderAt(new Date('2027-10-23T10:00:00Z'), 10).toISOString(),
    ).toBe('2027-11-02T11:00:00.000Z');
  });

  it('keeps the Prague date near midnight UTC', () => {
    // 00:30 Prague on 28 Mar 2027 (CET) + 1 day = 29 Mar 00:30 CEST
    expect(
      paymentReminderAt(new Date('2027-03-27T23:30:00Z'), 1).toISOString(),
    ).toBe('2027-03-28T22:30:00.000Z');
  });
});
