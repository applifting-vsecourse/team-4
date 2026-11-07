import { Gender } from '@/modules/registrations/domain/gender';
import {
  AccommodationInputs,
  ManagedRegistrationModel,
  paymentState,
} from '@/modules/registrations/domain/managed-registration';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';

describe('paymentState', () => {
  it.each([
    [0, 0, 'none'],
    [790_000, 0, 'unpaid'],
    [790_000, 190_000, 'partial'],
    [790_000, 790_000, 'paid'],
    [790_000, 800_000, 'overpaid'],
    // A payment with nothing due is an overpayment, not "no obligation".
    [0, 100, 'overpaid'],
  ])('due %i, paid %i is %s', (due, paid, state) => {
    expect(paymentState(due, paid)).toBe(state);
  });
});

const REMINDER = new Date('2027-06-28T08:00:00Z');

const registration = (
  terms: [ParticipationStatus, number][],
  payments: number[] = [],
  {
    gender = null,
    accommodation = { hardAttribute: null, manualValue: null },
  }: {
    gender?: Gender | null;
    accommodation?: AccommodationInputs;
  } = {},
): ManagedRegistrationModel =>
  new ManagedRegistrationModel(
    'r',
    new Date('2026-10-10T07:31:05Z'),
    'Eliška',
    'Svobodová',
    'eliska@example.test',
    '+420601234567',
    terms.map(([status, priceMinor], index) => ({
      termId: `t${index}`,
      label: `T${index + 1}`,
      startDate: '2027-07-01',
      endDate: '2027-07-07',
      priceMinor,
      status,
    })),
    '2027094',
    REMINDER,
    payments.map((amountMinor, index) => ({
      id: `p${index}`,
      receivedOn: '2026-10-12',
      amountMinor,
      source: 'organizer' as const,
    })),
    gender,
    null,
    accommodation,
  );

describe('requiresManualAccommodation (F64, S3-01)', () => {
  const GENDER = {
    attribute: 'gender',
    nonDeterminingValues: ['other', 'undisclosed'],
  };

  it.each<[Gender | null, boolean]>([
    ['female', false],
    ['male', false],
    ['other', true],
    ['undisclosed', true],
    [null, true],
  ])('with gender as the hard attribute, %s is %s', (gender, expected) => {
    expect(
      registration([], [], {
        gender,
        accommodation: { hardAttribute: GENDER, manualValue: null },
      }).requiresManualAccommodation,
    ).toBe(expected);
  });

  it('is never needed without a hard attribute', () => {
    expect(
      registration([], [], { gender: 'undisclosed' })
        .requiresManualAccommodation,
    ).toBe(false);
  });

  it('is settled by a determination until the answer changes', () => {
    const determined = (gender: Gender): boolean =>
      registration([], [], {
        gender,
        accommodation: {
          hardAttribute: GENDER,
          manualValue: { value: 'female', basedOnAnswer: 'undisclosed' },
        },
      }).requiresManualAccommodation;
    expect(determined('undisclosed')).toBe(false);
    expect(determined('other')).toBe(true);
  });
});

describe('ManagedRegistrationModel', () => {
  it('owes only the confirmed terms of a mixed registration', () => {
    const mixed = registration(
      [
        ['confirmed', 790_000],
        ['waitlisted', 390_000],
      ],
      [190_000],
    );
    expect(mixed.selectedPriceMinor).toBe(1_180_000);
    expect(mixed.amountDueMinor).toBe(790_000);
    expect(mixed.paidMinor).toBe(190_000);
    expect(mixed.balanceMinor).toBe(600_000);
    expect(mixed.paymentState).toBe('partial');
    expect(mixed.reminderAt).toBe(REMINDER);
  });

  it('settles at zero and shows an overpayment as a negative balance', () => {
    expect(registration([['confirmed', 100]], [100]).balanceMinor).toBe(0);
    expect(registration([['confirmed', 100]], [150]).balanceMinor).toBe(-50);
  });

  it('has no reminder date without an obligation', () => {
    const waiting = registration([['waitlisted', 790_000]]);
    expect(waiting.amountDueMinor).toBe(0);
    expect(waiting.paymentState).toBe('none');
    expect(waiting.reminderAt).toBeNull();
  });
});
