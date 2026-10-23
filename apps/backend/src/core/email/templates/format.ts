const PRAGUE = 'Europe/Prague';

const crowns = (fractionDigits: number): Intl.NumberFormat =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
const wholeCrowns = crowns(0);
const withHalere = crowns(2);

/** "4 500 Kč", or "3 900,50 Kč" where there are haléře; no-break spaces. */
export const formatMoney = (minor: number): string =>
  (minor % 100 === 0 ? wholeCrowns : withHalere)
    .format(minor / 100)
    .replace(/[\s\u202f]/g, '\u00a0');

const day = (isoDate: string): { d: number; m: number; y: number } => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return { d, m, y };
};

/** "6. 7. – 12. 7. 2026" from calendar dates; the year once when it is shared. */
export const formatDateRange = (start: string, end: string): string => {
  const a = day(start);
  const b = day(end);
  if (start === end) return `${b.d}.\u00a0${b.m}.\u00a0${b.y}`;
  const from =
    a.y === b.y ? `${a.d}.\u00a0${a.m}.` : `${a.d}.\u00a0${a.m}.\u00a0${a.y}`;
  return `${from} – ${b.d}.\u00a0${b.m}.\u00a0${b.y}`;
};

const pragueDay = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: PRAGUE,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

/** The calendar day of an instant in Prague, with the zone named. */
export const formatPragueDate = (instant: Date): string =>
  `${pragueDay.format(instant).replace(/\s/g, '\u00a0')} (${PRAGUE})`;

export const formatBankAccount = (account: {
  prefix: string | null;
  number: string;
  bankCode: string;
}): string =>
  `${account.prefix ? `${account.prefix}-` : ''}${account.number}/${account.bankCode}`;
