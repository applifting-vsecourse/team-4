import { DateRange } from '@/modules/events/domain/calendar-date';
import {
  findInvalidAccountField,
  PaymentSettings,
} from '@/modules/events/domain/payment-settings';

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

/** What is still missing before registration can be opened (S2-06). */
export type OpeningBlocker =
  'name' | 'description' | 'location' | 'terms' | 'paymentSettings';

export type OpeningInput = EventInput & {
  termCount: number;
  paymentSettings: PaymentSettings | null;
};

/**
 * The opening preconditions (data-model.md §3.3). Rooms and free capacity are
 * deliberately not among them, and a term at 0 Kč counts as a term. The saved
 * account was checked when it was saved; it is checked again here, so a row
 * written any other way cannot open registration.
 */
export const findOpeningBlockers = (input: OpeningInput): OpeningBlocker[] => {
  const blockers: OpeningBlocker[] = [];
  if (input.name.trim() === '') blockers.push('name');
  if (input.description.trim() === '') blockers.push('description');
  if (input.location.trim() === '') blockers.push('location');
  if (input.termCount < 1) blockers.push('terms');
  const payment = input.paymentSettings;
  if (
    !payment ||
    payment.paymentReminderDays < 1 ||
    findInvalidAccountField(
      payment.bankAccountPrefix,
      payment.bankAccountNumber,
    )
  ) {
    blockers.push('paymentSettings');
  }
  return blockers;
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
    public readonly description: string,
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
    /** For registrations received from now on; null until completed (S2-09). */
    public readonly paymentSettings: PaymentSettings | null,
    /** Short random id of the public link `/e/:publicId`; never changes. */
    public readonly publicId: string,
  ) {}

  get openingBlockers(): OpeningBlocker[] {
    return findOpeningBlockers({
      name: this.name,
      description: this.description,
      location: this.location,
      termCount: this.terms.length,
      paymentSettings: this.paymentSettings,
    });
  }
}

/** The only fields a visitor of the public link may see. */
export class PublicEventModel {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly location: string,
    public readonly terms: Omit<EventTermModel, 'capacity'>[],
  ) {}
}

/** A room's beds in one term; an unavailable room adds none (F11-1). */
export type RoomBeds = {
  isAvailable: boolean;
  baseBeds: number;
  extraBeds: number;
};

export type BedTotals = { baseBeds: number; extraBeds: number };

/** Capacity is never stored: it is the sum of beds of the rooms available in the term. */
export const bedTotals = (rooms: RoomBeds[]): BedTotals =>
  rooms
    .filter((room) => room.isAvailable)
    .reduce(
      (sum, room) => ({
        baseBeds: sum.baseBeds + room.baseBeds,
        extraBeds: sum.extraBeds + room.extraBeds,
      }),
      { baseBeds: 0, extraBeds: 0 },
    );

export const capacityFromBeds = (rooms: RoomBeds[]): number => {
  const { baseBeds, extraBeds } = bedTotals(rooms);
  return baseBeds + extraBeds;
};
