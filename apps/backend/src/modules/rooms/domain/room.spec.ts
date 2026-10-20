import {
  findCapacityShortfall,
  TermCapacity,
  termCapacity,
} from '@/modules/rooms/domain/room';

const term = (
  id: string,
  capacity: number,
  confirmed: number,
): TermCapacity => ({
  id,
  label: id,
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  capacity,
  confirmed,
});

describe('termCapacity', () => {
  it('sums the beds of the available rooms', () => {
    const base = { id: 't', label: 'T', startDate: 'a', endDate: 'b' };
    expect(termCapacity(base, [2, 3], 1).capacity).toBe(5);
    expect(termCapacity(base, [], 0).capacity).toBe(0);
  });
});

describe('findCapacityShortfall', () => {
  it('allows lowering to exactly the confirmed participants', () => {
    expect(
      findCapacityShortfall([term('T1', 5, 3)], [term('T1', 3, 3)]),
    ).toBeUndefined();
  });

  it('refuses lowering below the confirmed participants', () => {
    expect(
      findCapacityShortfall([term('T1', 5, 3)], [term('T1', 2, 3)]),
    ).toMatchObject({ id: 'T1' });
  });

  it('names the term that is short, not the ones that stay fine', () => {
    const shortfall = findCapacityShortfall(
      [term('T1', 5, 3), term('T2', 3, 3)],
      [term('T1', 5, 3), term('T2', 0, 3)],
    );
    expect(shortfall?.id).toBe('T2');
  });

  it('does not blame a change for a term that was short and did not shrink', () => {
    expect(
      findCapacityShortfall([term('T1', 2, 3)], [term('T1', 2, 3)]),
    ).toBeUndefined();
    expect(
      findCapacityShortfall([term('T1', 2, 3)], [term('T1', 4, 3)]),
    ).toBeUndefined();
  });
});
