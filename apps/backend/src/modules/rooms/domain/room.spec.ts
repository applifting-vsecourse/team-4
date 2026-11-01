import {
  findCapacityShortfalls,
  TermCapacity,
  termCapacity,
  termOccupancy,
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
  baseBeds: capacity,
  extraBeds: 0,
  capacity,
  confirmed,
});

describe('termCapacity', () => {
  const base = { id: 't', label: 'T', startDate: 'a', endDate: 'b' };
  const room = (baseBeds: number, extraBeds = 0, isAvailable = true) => ({
    isAvailable,
    baseBeds,
    extraBeds,
  });

  it('sums base beds and extra beds of the available rooms', () => {
    expect(termCapacity(base, [room(2, 1), room(3)], 1)).toMatchObject({
      baseBeds: 5,
      extraBeds: 1,
      capacity: 6,
    });
    expect(termCapacity(base, [], 0).capacity).toBe(0);
  });

  it('adds nothing for an unavailable room, whatever its beds', () => {
    expect(termCapacity(base, [room(2), room(9, 4, false)], 0)).toMatchObject({
      baseBeds: 2,
      extraBeds: 0,
      capacity: 2,
    });
  });
});

describe('termOccupancy', () => {
  const counts = (occupancy: ReturnType<typeof termOccupancy>): number[] => [
    occupancy.capacity,
    occupancy.confirmed,
    occupancy.free,
    occupancy.waitlisted,
  ];

  it('shows a full term with a waiting participant as 2 / 2 / 0 / 1', () => {
    expect(counts(termOccupancy(term('T1', 2, 2), 1))).toEqual([2, 2, 0, 1]);
  });

  it('leaves every bed free without registrations', () => {
    expect(counts(termOccupancy(term('T1', 5, 0), 0))).toEqual([5, 0, 5, 0]);
  });

  it('keeps waiting participants of a term without beds', () => {
    expect(counts(termOccupancy(term('T1', 0, 0), 2))).toEqual([0, 0, 0, 2]);
  });

  it('never reports fewer than zero free beds', () => {
    expect(termOccupancy(term('T1', 1, 2), 0).free).toBe(0);
  });
});

describe('findCapacityShortfalls', () => {
  it('allows lowering to exactly the confirmed participants', () => {
    expect(
      findCapacityShortfalls([term('T1', 5, 3)], [term('T1', 3, 3)]),
    ).toEqual([]);
  });

  it('refuses lowering below the confirmed participants', () => {
    expect(
      findCapacityShortfalls([term('T1', 5, 3)], [term('T1', 2, 3)]),
    ).toMatchObject([{ id: 'T1' }]);
  });

  it('names the term that is short, not the ones that stay fine', () => {
    const shortfalls = findCapacityShortfalls(
      [term('T1', 5, 3), term('T2', 3, 3)],
      [term('T1', 5, 3), term('T2', 0, 3)],
    );
    expect(shortfalls.map((t) => t.id)).toEqual(['T2']);
  });

  it('does not blame a change for a term that was short and did not shrink', () => {
    expect(
      findCapacityShortfalls([term('T1', 2, 3)], [term('T1', 2, 3)]),
    ).toEqual([]);
    expect(
      findCapacityShortfalls([term('T1', 2, 3)], [term('T1', 4, 3)]),
    ).toEqual([]);
  });

  it('lists every term that is short', () => {
    expect(
      findCapacityShortfalls(
        [term('T1', 5, 3), term('T2', 3, 3)],
        [term('T1', 1, 3), term('T2', 0, 3)],
      ).map((t) => t.id),
    ).toEqual(['T1', 'T2']);
  });
});
