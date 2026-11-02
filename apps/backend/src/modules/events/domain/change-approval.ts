import { DateRange } from '@/modules/events/domain/calendar-date';

/**
 * The largest value the 32-bit `changeApprovalDays` column holds; the story
 * sets no business limit, so a larger one must fail at the field.
 */
export const MAX_CHANGE_APPROVAL_DAYS = 2_147_483_647;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today as a `yyyy-MM-dd` calendar date in Europe/Prague. */
export const pragueToday = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const daysUntil = (today: string, startDate: string): number =>
  Math.round(
    (Date.parse(`${startDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS,
  );

/**
 * A change needs approval once any affected term is within `days` calendar
 * days of its start, counting the boundary day itself and the days after the
 * start (0 = from the day the term begins). Without a setting nothing does.
 * The caller picks the affected terms: all active terms for a data change,
 * the old and the new term for a move, the cancelled ones for a cancellation.
 */
export const requiresApproval = (
  days: number | null,
  affectedTerms: Pick<DateRange, 'startDate'>[],
  now: Date,
): boolean => {
  if (days === null) return false;
  const today = pragueToday(now);
  return affectedTerms.some((term) => daysUntil(today, term.startDate) <= days);
};
