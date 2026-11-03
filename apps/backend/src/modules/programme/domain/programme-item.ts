/** One item of a term's programme; the start is Europe/Prague wall-clock time. */
export type ProgrammeItemModel = {
  id: string;
  title: string;
  /** `yyyy-MM-dd` */
  startDate: string;
  /** `HH:mm` */
  startTime: string;
  place: string | null;
  description: string | null;
};

export type ProgrammeItemInput = Omit<ProgrammeItemModel, 'id'>;

/** The term a programme belongs to; the dates bound its items. */
export type ProgrammeTerm = { startDate: string; endDate: string };

/** True for a real calendar date written as `yyyy-MM-dd`. */
export const isCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/** Both ends of the term are inclusive. */
export const isWithinTerm = (date: string, term: ProgrammeTerm): boolean =>
  date >= term.startDate && date <= term.endDate;
