import { eventPayments } from '@/modules/registrations/domain/event-payments';
import {
  ManagedRegistrationModel,
  ReceivedPayment,
} from '@/modules/registrations/domain/managed-registration';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';

const registration = (
  id: string,
  status: ParticipationStatus,
  payments: Omit<ReceivedPayment, 'source'>[] = [],
): ManagedRegistrationModel =>
  new ManagedRegistrationModel(
    id,
    new Date('2026-10-10T07:31:05Z'),
    `Jméno ${id}`,
    `Příjmení ${id}`,
    `${id}@example.test`,
    '+420601234567',
    [
      {
        termId: 't1',
        label: 'T1',
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        priceMinor: 100_000,
        status,
      },
    ],
    `VS-${id}`,
    null,
    payments.map((payment) => ({ ...payment, source: 'organizer' as const })),
    null,
    null,
    { hardAttribute: null, manualValue: null, answers: [] },
  );

describe('eventPayments', () => {
  it('lists the payments of every registration, newest first', () => {
    const overview = eventPayments([
      registration('a', 'confirmed', [
        { id: '0001', receivedOn: '2026-10-01', amountMinor: 30_000 },
        { id: '0004', receivedOn: '2026-10-03', amountMinor: 10_000 },
      ]),
      registration('b', 'confirmed', [
        { id: '0003', receivedOn: '2026-10-03', amountMinor: 20_000 },
      ]),
    ]);

    expect(
      overview.payments.map((payment) => [payment.id, payment.registration.id]),
    ).toEqual([
      // The same day: the later recorded one first.
      ['0004', 'a'],
      ['0003', 'b'],
      ['0001', 'a'],
    ]);
  });

  it('computes the balances as the registration list does', () => {
    const owing = registration('a', 'confirmed', [
      { id: '0001', receivedOn: '2026-10-01', amountMinor: 30_000 },
    ]);
    const [balance] = eventPayments([owing]).balances;

    expect(balance).toEqual({
      registration: {
        id: 'a',
        firstName: 'Jméno a',
        lastName: 'Příjmení a',
        variableSymbol: 'VS-a',
      },
      amountDueMinor: owing.amountDueMinor,
      paidMinor: owing.paidMinor,
      balanceMinor: owing.balanceMinor,
      paymentState: owing.paymentState,
    });
    expect(balance.balanceMinor).toBe(70_000);
    expect(balance.paymentState).toBe('partial');
  });

  it('leaves out registrations with nothing due and nothing paid', () => {
    const overview = eventPayments([
      registration('waiting', 'waitlisted'),
      registration('owing', 'confirmed'),
    ]);

    expect(overview.balances.map((b) => b.registration.id)).toEqual(['owing']);
  });

  it('keeps a payment without an obligation as an overpayment, without a VS', () => {
    const overview = eventPayments([
      registration('waiting', 'waitlisted', [
        { id: '0001', receivedOn: '2026-10-01', amountMinor: 50_000 },
      ]),
    ]);

    expect(overview.balances).toMatchObject([
      {
        registration: { id: 'waiting', variableSymbol: null },
        amountDueMinor: 0,
        paidMinor: 50_000,
        balanceMinor: -50_000,
        paymentState: 'overpaid',
      },
    ]);
    expect(overview.payments[0].registration.variableSymbol).toBeNull();
  });

  it('is empty for an event without registrations', () => {
    expect(eventPayments([])).toEqual({ payments: [], balances: [] });
  });
});
