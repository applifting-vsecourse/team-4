import {
  moveInOrder,
  termOrder,
} from '@/modules/accommodation/domain/term-order';

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

describe('moveInOrder', () => {
  const female = (
    id: string,
  ): { registrationId: string; effectiveValue: string } => ({
    registrationId: id,
    effectiveValue: 'female',
  });

  it('places P3 before P2 and keeps both orders (Př. 9)', () => {
    const result = moveInOrder(
      ['p1', 'p2', 'p3'],
      ['p1', 'p2', 'p3'].map(female),
      true,
      { registrationId: 'p3', targetId: 'p2', placement: 'before' },
    );

    expect(result).toEqual({
      kind: 'moved',
      move: {
        queue: 'female',
        before: ['p1', 'p2', 'p3'],
        after: ['p1', 'p3', 'p2'],
        queueBefore: ['p1', 'p2', 'p3'],
        queueAfter: ['p1', 'p3', 'p2'],
        fromPosition: 3,
        toPosition: 2,
      },
    });
  });

  it('changes the term order, the queue being a filtered view of it', () => {
    const result = moveInOrder(
      ['f1', 'm1', 'f2', 'm2', 'f3'],
      [
        female('f1'),
        { registrationId: 'm1', effectiveValue: 'male' },
        female('f2'),
        { registrationId: 'm2', effectiveValue: 'male' },
        female('f3'),
      ],
      true,
      { registrationId: 'f1', targetId: 'f3', placement: 'after' },
    );

    expect(result).toMatchObject({
      kind: 'moved',
      move: {
        after: ['m1', 'f2', 'm2', 'f3', 'f1'],
        queueBefore: ['f1', 'f2', 'f3'],
        queueAfter: ['f2', 'f3', 'f1'],
        fromPosition: 1,
        toPosition: 5,
      },
    });
  });

  it('moves anyone among everyone without a hard attribute', () => {
    const result = moveInOrder(
      ['a', 'b', 'c'],
      ['a', 'b', 'c'].map((id) => ({
        registrationId: id,
        effectiveValue: null,
      })),
      false,
      { registrationId: 'a', targetId: 'c', placement: 'after' },
    );

    expect(result).toMatchObject({
      kind: 'moved',
      move: {
        queue: null,
        after: ['b', 'c', 'a'],
        queueAfter: ['b', 'c', 'a'],
      },
    });
  });

  it('refuses a confirmed person, who is not in the order (Př. 9)', () => {
    expect(
      moveInOrder(['p2', 'p3'], [female('p2'), female('p3')], true, {
        registrationId: 'p1',
        targetId: 'p2',
        placement: 'before',
      }),
    ).toEqual({ kind: 'refused', refusal: 'person_not_movable' });
  });

  it('refuses someone waiting for a manual determination, and placing next to them', () => {
    const members = [
      female('f1'),
      { registrationId: 'u1', effectiveValue: null },
    ];
    expect(
      moveInOrder(['f1', 'u1'], members, true, {
        registrationId: 'u1',
        targetId: 'f1',
        placement: 'before',
      }),
    ).toEqual({ kind: 'refused', refusal: 'person_not_movable' });
    expect(
      moveInOrder(['f1', 'u1'], members, true, {
        registrationId: 'f1',
        targetId: 'u1',
        placement: 'after',
      }),
    ).toEqual({ kind: 'refused', refusal: 'target_invalid' });
  });

  it('refuses a target of another queue, the person itself, or no change', () => {
    const members = [
      female('f1'),
      female('f2'),
      { registrationId: 'm1', effectiveValue: 'male' },
    ];
    const order = ['f1', 'f2', 'm1'];
    expect(
      moveInOrder(order, members, true, {
        registrationId: 'f1',
        targetId: 'm1',
        placement: 'after',
      }),
    ).toEqual({ kind: 'refused', refusal: 'target_invalid' });
    expect(
      moveInOrder(order, members, true, {
        registrationId: 'f1',
        targetId: 'f1',
        placement: 'after',
      }),
    ).toEqual({ kind: 'refused', refusal: 'target_invalid' });
    expect(
      moveInOrder(order, members, true, {
        registrationId: 'f1',
        targetId: 'f2',
        placement: 'before',
      }),
    ).toEqual({ kind: 'refused', refusal: 'order_unchanged' });
  });
});
