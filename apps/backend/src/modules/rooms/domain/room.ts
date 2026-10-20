import { capacityFromBeds } from '@/modules/events/domain/event';

export type RoomInput = {
  label: string;
  bedCount: number;
  /** Terms of the same event in which the whole room is available. */
  termIds: string[];
};

export class RoomModel {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly bedCount: number,
    public readonly termIds: string[],
  ) {}
}

/** What a term can hold and what is already confirmed in it (data-model.md §3.6). */
export type TermCapacity = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  capacity: number;
  confirmed: number;
};

export class RoomsOverviewModel {
  constructor(
    public readonly rooms: RoomModel[],
    public readonly terms: TermCapacity[],
  ) {}
}

/** Capacity is never stored: it is the sum of beds available in the term. */
export const termCapacity = (
  term: { id: string; label: string; startDate: string; endDate: string },
  bedCounts: number[],
  confirmed: number,
): TermCapacity => ({
  ...term,
  capacity: capacityFromBeds(bedCounts),
  confirmed,
});

/**
 * The first term (by the order given) whose capacity a change lowered below
 * the confirmed participants. A term that was already short and did not get
 * smaller is not blamed on this change; waitlisted registrations hold no bed.
 */
export const findCapacityShortfall = (
  before: TermCapacity[],
  after: TermCapacity[],
): TermCapacity | undefined => {
  const previous = new Map(before.map((term) => [term.id, term.capacity]));
  return after.find(
    (term) =>
      term.capacity < term.confirmed &&
      term.capacity < (previous.get(term.id) ?? 0),
  );
};
