import {
  decideParticipation,
  normalizeEmail,
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
    );
    expect(result.selectedPriceMinor).toBe(450_051);
  });
});
