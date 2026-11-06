import { termOrder } from '@/modules/accommodation/domain/term-order';

const at = (time: string): Date => new Date(`2027-03-01T${time}Z`);

describe('termOrder', () => {
  it('orders by receipt, and the lower id first at the same millisecond (Př. 1)', () => {
    const P1 = '0190c0de-0000-7000-8000-00000000000b';
    const P2 = '0190c0de-0000-7000-8000-00000000000a';
    const P3 = '0190c0de-0000-7000-8000-000000000001';
    expect(
      termOrder(
        [
          { registrationId: P1, receivedAt: at('10:00:00.000') },
          { registrationId: P3, receivedAt: at('10:00:00.001') },
          { registrationId: P2, receivedAt: at('10:00:00.000') },
        ],
        null,
      ),
    ).toEqual([P2, P1, P3]);
  });

  it('keeps a manual move (Př. 9)', () => {
    const entries = [
      { registrationId: 'p1', receivedAt: at('10:00:00.000') },
      { registrationId: 'p2', receivedAt: at('10:01:00.000') },
      { registrationId: 'p3', receivedAt: at('10:02:00.000') },
    ];
    expect(termOrder(entries, ['p1', 'p3', 'p2'])).toEqual(['p1', 'p3', 'p2']);
  });

  it('puts a later registration after everyone received before it, the moved ones included', () => {
    const entries = [
      { registrationId: 'p1', receivedAt: at('10:00:00.000') },
      { registrationId: 'p2', receivedAt: at('10:01:00.000') },
      { registrationId: 'p3', receivedAt: at('10:02:00.000') },
      { registrationId: 'p4', receivedAt: at('10:03:00.000') },
    ];
    // P3 was moved to the top; P4 registered afterwards.
    expect(termOrder(entries, ['p3', 'p1', 'p2'])).toEqual([
      'p3',
      'p1',
      'p2',
      'p4',
    ]);
  });

  it('places someone moved into the term after the people received before them', () => {
    const entries = [
      { registrationId: 'p1', receivedAt: at('10:00:00.000') },
      { registrationId: 'p2', receivedAt: at('10:01:00.000') },
      { registrationId: 'late', receivedAt: at('10:00:30.000') },
    ];
    expect(termOrder(entries, ['p2', 'p1'])).toEqual(['p2', 'p1', 'late']);
    expect(termOrder(entries, ['p1', 'p2'])).toEqual(['p1', 'late', 'p2']);
  });

  it('leaves out stored ids that are no longer unconfirmed in the term', () => {
    expect(
      termOrder(
        [{ registrationId: 'p2', receivedAt: at('10:00:00.000') }],
        ['p1', 'p2'],
      ),
    ).toEqual(['p2']);
  });
});
