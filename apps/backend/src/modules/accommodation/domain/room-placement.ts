// Manual placement into rooms (F14-2, #337). A confirmed participant of a term
// has at most one room in it, or none; rooms are optional. A placement never
// changes participation, the order of the term or an evaluation. The rules of
// a room only warn: the organizer may confirm an exception and save anyway.

/**
 * What is wrong with a room in a term:
 * - `mixed`: different effective values of the hard attribute;
 * - `extra_bed`: more people than base beds, within the extra beds;
 * - `over_capacity`: more people than base and extra beds together;
 * - `room_unavailable`: people in a room unavailable in the term (it was
 *   placed before the room became unavailable; a new placement is refused).
 */
export type PlacementWarning =
  'mixed' | 'extra_bed' | 'over_capacity' | 'room_unavailable';

/** The warnings an organizer can confirm when placing someone. */
export type ConfirmableWarning = Exclude<PlacementWarning, 'room_unavailable'>;

/** The beds of a room in a term; a room without settings there has none. */
export type RoomBeds = {
  isAvailable: boolean;
  baseBeds: number;
  extraBeds: number;
};

export const NO_BEDS: RoomBeds = {
  isAvailable: false,
  baseBeds: 0,
  extraBeds: 0,
};

/**
 * The warnings of a room holding people with these effective values (null:
 * without one, which mixes with nobody). An empty room has none.
 */
export function roomWarnings(
  beds: RoomBeds,
  values: readonly (string | null)[],
): PlacementWarning[] {
  if (values.length === 0) return [];
  const warnings: PlacementWarning[] = [];
  const known = new Set(values.filter((value) => value !== null));
  if (known.size > 1) warnings.push('mixed');
  if (!beds.isAvailable) {
    warnings.push('room_unavailable');
  } else if (values.length > beds.baseBeds + beds.extraBeds) {
    warnings.push('over_capacity');
  } else if (values.length > beds.baseBeds) {
    warnings.push('extra_bed');
  }
  return warnings;
}

const isConfirmable = (w: PlacementWarning): w is ConfirmableWarning =>
  w !== 'room_unavailable';

/** Why a placement, a move, a removal or a lock is not saved. */
export type PlacementRefusal =
  /** Only a confirmed participant of the term gets a room. */
  | 'not_confirmed'
  /** No new placement into a room unavailable in the term. */
  | 'room_unavailable'
  /** A locked placement is neither moved nor removed until unlocked. */
  | 'placement_locked'
  /** Locking or unlocking needs a placement. */
  | 'not_placed';

/** The person as the decision needs them. */
export type PlacedPerson = {
  isConfirmed: boolean;
  /** Their room in the term now; null without one. */
  current: { roomId: string; isLocked: boolean } | null;
};

export type PlaceDecision =
  | { kind: 'refused'; refusal: PlacementRefusal }
  /** Nothing to change: already in that room. */
  | { kind: 'unchanged' }
  /** The room would warn about more than confirmed; saved only once all are. */
  | { kind: 'needs_confirmation'; warnings: ConfirmableWarning[] }
  | { kind: 'place'; confirmedWarnings: ConfirmableWarning[] };

/**
 * Whether to place the person into a room with these beds, whose people after
 * the placement have `valuesAfter`. Every warning of the room after it needs
 * the organizer's confirmation, also one the room already had: each further
 * person deepens it. The organizer confirms the warnings they were shown, so
 * one that appeared since (someone else placed meanwhile) is asked about anew.
 */
export function decidePlacement(
  person: PlacedPerson,
  roomId: string,
  beds: RoomBeds,
  valuesAfter: readonly (string | null)[],
  confirmed: readonly ConfirmableWarning[],
): PlaceDecision {
  if (!person.isConfirmed) return { kind: 'refused', refusal: 'not_confirmed' };
  if (person.current?.roomId === roomId) return { kind: 'unchanged' };
  if (person.current?.isLocked) {
    return { kind: 'refused', refusal: 'placement_locked' };
  }
  if (!beds.isAvailable) {
    return { kind: 'refused', refusal: 'room_unavailable' };
  }
  const warnings = roomWarnings(beds, valuesAfter).filter(isConfirmable);
  if (warnings.some((warning) => !confirmed.includes(warning))) {
    return { kind: 'needs_confirmation', warnings };
  }
  return { kind: 'place', confirmedWarnings: warnings };
}

/**
 * Whether to take the person out of their room; null: nothing to remove. The
 * placement of someone no longer confirmed is shown nowhere and protects
 * nothing, so it goes even when locked.
 */
export function decideRemoval(
  person: PlacedPerson,
): PlacementRefusal | 'remove' | null {
  if (!person.current) return null;
  if (person.current.isLocked && person.isConfirmed) return 'placement_locked';
  return 'remove';
}

/** Whether to lock or unlock the person's placement; unlocking needs no confirmation. */
export function decideLock(
  person: PlacedPerson,
  isLocked: boolean,
): PlacementRefusal | 'lock' {
  if (!person.current) return 'not_placed';
  if (isLocked && !person.isConfirmed) return 'not_confirmed';
  return 'lock';
}

/** "Jana Svobodová" */
export const fullName = (person: {
  firstName: string;
  lastName: string;
}): string => `${person.firstName} ${person.lastName}`;

/** By name in Czech order, then by id, so equal names keep one order. */
export const byName = <T extends { name: string; registrationId: string }>(
  a: T,
  b: T,
): number =>
  a.name.localeCompare(b.name, 'cs') ||
  (a.registrationId < b.registrationId ? -1 : 1);
