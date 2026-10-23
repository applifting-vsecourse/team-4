import { toDate } from '@/modules/events/domain/calendar-date';

/** 10 million CZK in haléře, the same bound as one price (S2-04). */
export const MAX_PAYMENT_MINOR = 1_000_000_000;

export type PaymentInput = {
  /** Generated when the dialog opens and sent with every retry. */
  submissionKey: string;
  amountMinor: number;
  /** Calendar date the money arrived, yyyy-MM-dd. */
  receivedOn: string;
};

// `en-CA` formats a date as yyyy-MM-dd.
const pragueDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar day it is in Prague at `now`; "today" for a payment date (§3.9). */
export const todayInPrague = (now: Date = new Date()): string =>
  pragueDay.format(now);

/** A payment cannot have been received after today (Europe/Prague). */
export const isFutureDate = (receivedOn: string, now?: Date): boolean =>
  receivedOn > todayInPrague(now);

/** Whether a stored payment is the one this request describes. */
export const isSamePayment = (
  stored: { registrationId: string; amountMinor: number; receivedOn: Date },
  registrationId: string,
  input: PaymentInput,
): boolean =>
  stored.registrationId === registrationId &&
  stored.amountMinor === input.amountMinor &&
  stored.receivedOn.getTime() === toDate(input.receivedOn).getTime();
