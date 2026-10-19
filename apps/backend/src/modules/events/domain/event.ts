import { DateRange } from '@/modules/events/domain/calendar-date';

export type EventStatus = 'draft' | 'open' | 'closed';

export type EventInput = {
  name: string;
  description: string;
  location: string;
};

export type TermInput = DateRange & {
  label: string;
  /** Haléře; 0 is a valid free term. */
  priceMinor: number;
};

export class EventTermModel {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly startDate: string,
    public readonly endDate: string,
    public readonly priceMinor: number,
    /** Derived from the beds of rooms available in the term (S2-05). */
    public readonly capacity: number,
  ) {}
}

export class EventSummaryModel {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly location: string,
    public readonly status: EventStatus,
    public readonly termCount: number,
    /** First start and last end over all terms; null without terms. */
    public readonly period: DateRange | null,
  ) {}
}

export class EventDetailModel {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly location: string,
    public readonly status: EventStatus,
    /** Set from the first opening on, and never cleared (data-model.md §3.3). */
    public readonly isLocked: boolean,
    public readonly terms: EventTermModel[],
  ) {}
}

/** Capacity is never stored: it is the sum of beds available in the term. */
export const capacityFromBeds = (bedCounts: number[]): number =>
  bedCounts.reduce((sum, beds) => sum + beds, 0);
