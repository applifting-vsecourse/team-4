import { ParticipantRegistrationModel } from '@/modules/registrations/domain/participant-registration';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';
import { NO_NEEDS } from '@/modules/registrations/domain/registration-needs';

const REMINDER = new Date('2027-06-28T08:00:00Z');

const registration = (
  terms: [ParticipationStatus, number][],
  payments: number[] = [],
  reminder: Date | null = REMINDER,
): ParticipantRegistrationModel =>
  new ParticipantRegistrationModel(
    'r',
    new Date('2026-10-10T07:31:05Z'),
    { name: 'Tábor', location: 'Jizerka' },
    terms.map(([status, priceMinor], index) => ({
      termId: `t${index}`,
      label: `T${index + 1}`,
      startDate: '2027-07-01',
      endDate: '2027-07-07',
      priceMinor,
      status,
    })),
    '2027094',
    { prefix: null, number: '123456789', bankCode: '0800' },
    reminder,
    payments.map((amountMinor, index) => ({
      id: `p${index}`,
      receivedOn: '2026-10-12',
      amountMinor,
      source: 'organizer' as const,
    })),
    'a'.repeat(64),
    {
      firstName: 'Jana',
      lastName: 'Nováková',
      email: 'jana@example.com',
      phone: '+420777123456',
    },
    0,
    false,
    NO_NEEDS,
  );

describe('ParticipantRegistrationModel', () => {
  it('asks for the remaining debt of a mixed registration only', () => {
    const mixed = registration(
      [
        ['confirmed', 790_000],
        ['waitlisted', 390_000],
      ],
      [190_000],
    );
    expect(mixed.selectedPriceMinor).toBe(1_180_000);
    expect(mixed.amountDueMinor).toBe(790_000);
    expect(mixed.balanceMinor).toBe(600_000);
    expect(mixed.paymentInstructions).toMatchObject({
      amountMinor: 600_000,
      variableSymbol: '2027094',
      reminderAt: REMINDER,
    });
  });

  it('offers the QR payment link only while a debt remains', () => {
    expect(registration([['confirmed', 790_000]]).paymentLinkToken).toBe(
      'a'.repeat(64),
    );
    expect(
      registration([['confirmed', 790_000]], [790_000]).paymentLinkToken,
    ).toBeNull();
    expect(
      registration([['confirmed', 790_000]], [800_000]).paymentLinkToken,
    ).toBeNull();
  });

  it('has no instructions with only waitlisted terms', () => {
    const waiting = registration([['waitlisted', 790_000]], [], null);
    expect(waiting.amountDueMinor).toBe(0);
    expect(waiting.paymentInstructions).toBeNull();
  });

  it('has no instructions for free confirmed terms', () => {
    expect(registration([['confirmed', 0]]).paymentInstructions).toBeNull();
  });

  it('stops asking once settled or overpaid', () => {
    expect(
      registration([['confirmed', 1000]], [1000]).paymentInstructions,
    ).toBeNull();
    expect(
      registration([['confirmed', 1000]], [1500]).paymentInstructions,
    ).toBeNull();
  });

  it('leaves a released term out of the selected price and the amount due', () => {
    const released = registration([
      ['confirmed', 790_000],
      ['cancelled', 390_000],
    ]);
    expect(released.selectedPriceMinor).toBe(790_000);
    expect(released.amountDueMinor).toBe(790_000);
    expect(released.canChange).toBe(true);
  });

  it('reads as cancelled, and offers no change, once every term is released', () => {
    const cancelled = registration([['cancelled', 790_000]]);
    expect(cancelled.isCancelled).toBe(true);
    expect(cancelled.canChange).toBe(false);
  });
});
