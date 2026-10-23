import {
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
    })),
  );

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
