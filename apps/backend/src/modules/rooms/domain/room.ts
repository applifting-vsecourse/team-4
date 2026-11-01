import { bedTotals, RoomBeds } from '@/modules/events/domain/event';

/** A room's settings in one term of its event. */
export type RoomTermSetting = RoomBeds & { termId: string };

export type RoomInput = {
  label: string;
  /** Terms of the same event the room has settings for. */
  terms: RoomTermSetting[];
};

export class RoomModel {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly terms: RoomTermSetting[],
  ) {}
}

/** What a term can hold and what is already confirmed in it (data-model.md §3.6). */
export type TermCapacity = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  baseBeds: number;
  extraBeds: number;
  /** Base beds plus extra beds of the available rooms. */
  capacity: number;
  confirmed: number;
};

/** A term's capacity with how it is taken up (S2-10). */
export type TermOccupancy = TermCapacity & {
  /** Beds not taken by a confirmed participant; never below zero. */
  free: number;
  /** Waiting participants hold no bed and do not lower `free`. */
  waitlisted: number;
};

export class RoomsOverviewModel {
  constructor(
    public readonly rooms: RoomModel[],
    public readonly terms: TermOccupancy[],
  ) {}
}

/** Capacity is never stored: it is the sum of beds of the rooms available in the term. */
export const termCapacity = (
  term: { id: string; label: string; startDate: string; endDate: string },
  rooms: RoomBeds[],
  confirmed: number,
): TermCapacity => {
  const totals = bedTotals(rooms);
  return {
    ...term,
    ...totals,
    capacity: totals.baseBeds + totals.extraBeds,
    confirmed,
  };
};

export const termOccupancy = (
  term: TermCapacity,
  waitlisted: number,
): TermOccupancy => ({
  ...term,
  free: Math.max(term.capacity - term.confirmed, 0),
  waitlisted,
});

/**
 * The terms (in the order given) whose capacity a change lowered below the
 * confirmed participants. A term that was already short and did not get
 * smaller is not blamed on this change; waitlisted registrations hold no bed.
 */
export const findCapacityShortfalls = (
  before: TermCapacity[],
  after: TermCapacity[],
): TermCapacity[] => {
  const previous = new Map(before.map((term) => [term.id, term.capacity]));
  return after.filter(
    (term) =>
      term.capacity < term.confirmed &&
      term.capacity < (previous.get(term.id) ?? 0),
  );
};
