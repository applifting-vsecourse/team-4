// Calendar dates (`yyyy-MM-dd`) without time or zone, stored as Postgres
// `date`. Prisma reads a `date` as midnight UTC, so the conversion stays in UTC
// and a date never shifts by a day (data-model.md §3.4).

export const toDate = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

export const fromDate = (value: Date): string =>
  value.toISOString().slice(0, 10);

export type DateRange = { startDate: string; endDate: string };

/** Both ends are inclusive: 1.–7. and 7.–10. overlap, 1.–7. and 8.–10. do not. */
export const rangesOverlap = (a: DateRange, b: DateRange): boolean =>
  a.startDate <= b.endDate && b.startDate <= a.endDate;
