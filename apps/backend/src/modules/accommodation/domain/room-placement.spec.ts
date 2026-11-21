import {
  decideLock,
  decidePlacement,
  decideRemoval,
  NO_BEDS,
  PlaceDecision,
  PlacedPerson,
  RoomBeds,
  roomWarnings,
} from './room-placement';

const beds = (
  baseBeds: number,
  extraBeds = 0,
  isAvailable = true,
): RoomBeds => ({
  isAvailable,
  baseBeds,
  extraBeds,
});

const free: PlacedPerson = { isConfirmed: true, current: null };

describe('roomWarnings', () => {
  it('has none for an empty room, even an unavailable one', () => {
    expect(roomWarnings(NO_BEDS, [])).toEqual([]);
  });

  it('warns about an extra bed, then about capacity', () => {
    expect(roomWarnings(beds(2, 1), ['f', 'f'])).toEqual([]);
    expect(roomWarnings(beds(2, 1), ['f', 'f', 'f'])).toEqual(['extra_bed']);
    expect(roomWarnings(beds(2, 1), ['f', 'f', 'f', 'f'])).toEqual([
      'over_capacity',
    ]);
  });

  it('mixes only different known values; someone without one mixes with nobody', () => {
    expect(roomWarnings(beds(3), ['f', null, 'f'])).toEqual([]);
    expect(roomWarnings(beds(3), ['f', 'm'])).toEqual(['mixed']);
  });

  it('warns about people in an unavailable room instead of its beds', () => {
    expect(roomWarnings(beds(2, 0, false), ['f', 'm'])).toEqual([
      'mixed',
      'room_unavailable',
    ]);
  });
});

describe('decidePlacement', () => {
  it('places into a room that stays within its rules', () => {
    expect(decidePlacement(free, 'r', beds(2), ['f'], [])).toEqual({
      kind: 'place',
      confirmedWarnings: [],
    });
  });

  it('asks to confirm each warning of the room after it, and saves them once all are confirmed', () => {
    expect(decidePlacement(free, 'r', beds(1), ['f', 'm'], [])).toEqual({
      kind: 'needs_confirmation',
      warnings: ['mixed', 'over_capacity'],
    });
    // A warning not confirmed, e.g. one that appeared since, asks again.
    expect(
      decidePlacement(free, 'r', beds(1), ['f', 'm'], ['over_capacity']),
    ).toEqual({
      kind: 'needs_confirmation',
      warnings: ['mixed', 'over_capacity'],
    });
    expect(
      decidePlacement(
        free,
        'r',
        beds(1),
        ['f', 'm'],
        ['over_capacity', 'mixed', 'extra_bed'],
      ),
    ).toEqual({
      kind: 'place',
      confirmedWarnings: ['mixed', 'over_capacity'],
    });
  });

  it('refuses someone unconfirmed, a locked placement and an unavailable room', () => {
    const decide = (person: PlacedPerson, b = beds(2)): PlaceDecision =>
      decidePlacement(person, 'r', b, [null], ['extra_bed']);
    expect(decide({ isConfirmed: false, current: null })).toEqual({
      kind: 'refused',
      refusal: 'not_confirmed',
    });
    expect(
      decide({ isConfirmed: true, current: { roomId: 'q', isLocked: true } }),
    ).toEqual({ kind: 'refused', refusal: 'placement_locked' });
    expect(decide(free, NO_BEDS)).toEqual({
      kind: 'refused',
      refusal: 'room_unavailable',
    });
  });

  it('changes nothing for the room the person is in, locked or not', () => {
    const person = {
      isConfirmed: true,
      current: { roomId: 'r', isLocked: true },
    };
    expect(decidePlacement(person, 'r', NO_BEDS, ['f'], [])).toEqual({
      kind: 'unchanged',
    });
  });
});

describe('decideRemoval and decideLock', () => {
  const placed = (isLocked: boolean): PlacedPerson => ({
    isConfirmed: true,
    current: { roomId: 'r', isLocked },
  });

  it('removes an unlocked placement, refuses a locked one, ignores none', () => {
    expect(decideRemoval(placed(false))).toBe('remove');
    expect(decideRemoval(placed(true))).toBe('placement_locked');
    expect(decideRemoval(free)).toBeNull();
  });

  it('cleans up the placement of someone no longer confirmed, even a locked one', () => {
    const gone = {
      isConfirmed: false,
      current: { roomId: 'r', isLocked: true },
    };
    expect(decideRemoval(gone)).toBe('remove');
    expect(decideLock(gone, false)).toBe('lock');
    expect(decideLock(gone, true)).toBe('not_confirmed');
  });

  it('locks only a placement of a confirmed participant', () => {
    expect(decideLock(placed(false), true)).toBe('lock');
    expect(decideLock(free, true)).toBe('not_placed');
    expect(
      decideLock(
        {
          isConfirmed: false,
          current: { roomId: 'r', isLocked: false },
        },
        true,
      ),
    ).toBe('not_confirmed');
  });
});
