// A bank statement in CSV, as exported from the account movements of the
// internet banking (F23): a few lines about the account and period, then a
// header row and one row per movement, `;`-separated, values in quotes. The
// header row is found by its column names, so the lines above it do not
// matter. Only incoming movements are kept; outgoing ones are counted.

export const MAX_STATEMENT_BYTES = 2 * 1024 * 1024;

export type StatementTransaction = {
  bankTransactionId: string;
  bookedOn: string; // yyyy-MM-dd
  amountMinor: number;
  variableSymbol: string | null;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  message: string | null;
};

export type ParsedStatement = {
  transactions: StatementTransaction[];
  /** Outgoing (or zero) movements of the statement, which are not imported. */
  skippedOutgoing: number;
};

export type StatementError = {
  code: 'statement_format' | 'statement_invalid';
  message: string;
};

export type StatementResult =
  | { ok: true; statement: ParsedStatement }
  | { ok: false; error: StatementError };

const FORMAT_MESSAGE =
  'Soubor není podporovaný výpis. Nahrajte výpis pohybů na účtu ve formátu CSV.';

// Column names, as exported; the first name found is used.
const COLUMNS = {
  id: ['ID pohybu', 'ID operace'],
  date: ['Datum'],
  amount: ['Objem'],
  currency: ['Měna'],
  account: ['Protiúčet'],
  bankCode: ['Kód banky'],
  name: ['Název protiúčtu'],
  variableSymbol: ['VS'],
  message: ['Zpráva pro příjemce'],
  note: ['Poznámka'],
} as const;

type Column = keyof typeof COLUMNS;
const REQUIRED: Column[] = ['id', 'date', 'amount', 'currency'];

/** UTF-8 (with or without a BOM), otherwise the Czech Windows code page. */
export const decodeStatement = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(
      bytes,
    );
  } catch {
    return new TextDecoder('windows-1250').decode(bytes);
  }
};

type Row = { line: number; cells: string[] };

/** RFC 4180 records with `;` or `,`; quoted values may hold the separator. */
export const parseCsv = (text: string): Row[] => {
  const delimiter = text.includes(';') ? ';' : ',';
  const rows: Row[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === '\n') line += 1;
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      cells.push(cell);
      rows.push({ line: rowLine, cells });
      cells = [];
      cell = '';
      line += 1;
      rowLine = line;
    } else {
      cell += char;
    }
  }
  if (cell !== '' || cells.length) {
    cells.push(cell);
    rows.push({ line: rowLine, cells });
  }
  return rows;
};

const isBlank = (row: Row): boolean =>
  row.cells.every((cell) => cell.trim() === '');

const headerIndexes = (row: Row): Partial<Record<Column, number>> | null => {
  const names = row.cells.map((cell) => cell.trim());
  const indexes: Partial<Record<Column, number>> = {};
  for (const [column, aliases] of Object.entries(COLUMNS) as [
    Column,
    readonly string[],
  ][]) {
    const index = names.findIndex((name) => aliases.includes(name));
    if (index >= 0) indexes[column] = index;
  }
  return REQUIRED.every((column) => indexes[column] !== undefined)
    ? indexes
    : null;
};

/** `dd.MM.yyyy` (day and month may have one digit) to `yyyy-MM-dd`, or null. */
export const parseStatementDate = (value: string): string | null => {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso)
    ? iso
    : null;
};

/** `1 500,00`, `-250,5` or `1500.00` in haléře, or null. */
export const parseStatementAmount = (value: string): number | null => {
  // `\s` also covers a no-break space.
  const compact = value.replace(/\s/g, '').replace(',', '.');
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(compact);
  if (!match) return null;
  const [, sign, whole, fraction = ''] = match;
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor > 2_147_483_647) return null;
  return sign === '-' ? -minor : minor;
};

const optional = (value: string | undefined, max: number): string | null => {
  const trimmed = value?.replace(/\s+/g, ' ').trim() ?? '';
  return trimmed === '' ? null : trimmed.slice(0, max);
};

const invalid = (line: number, what: string): StatementResult => ({
  ok: false,
  error: {
    code: 'statement_invalid',
    message: `Řádek ${line} výpisu obsahuje ${what}. Výpis nebyl uložen; zkontrolujte soubor a nahrajte ho znovu.`,
  },
});

/** Reads a whole statement; any invalid movement rejects all of it. */
export const parseStatement = (bytes: Uint8Array): StatementResult => {
  const rows = parseCsv(decodeStatement(bytes));
  const headerAt = rows.findIndex((row) => headerIndexes(row) !== null);
  if (headerAt < 0)
    return {
      ok: false,
      error: { code: 'statement_format', message: FORMAT_MESSAGE },
    };
  const columns = headerIndexes(rows[headerAt]!)!;
  const cell = (row: Row, column: Column): string | undefined =>
    columns[column] === undefined ? undefined : row.cells[columns[column]];

  const transactions: StatementTransaction[] = [];
  const seen = new Set<string>();
  let skippedOutgoing = 0;
  for (const row of rows.slice(headerAt + 1)) {
    if (isBlank(row)) continue;
    const id = cell(row, 'id')?.trim() ?? '';
    if (id === '' || id.length > 40)
      return invalid(row.line, 'neplatné ID pohybu');
    const bookedOn = parseStatementDate(cell(row, 'date') ?? '');
    if (!bookedOn) return invalid(row.line, 'neplatné datum');
    const amountMinor = parseStatementAmount(cell(row, 'amount') ?? '');
    if (amountMinor === null) return invalid(row.line, 'neplatnou částku');
    const currency = cell(row, 'currency')?.trim().toUpperCase();
    if (currency !== 'CZK') return invalid(row.line, 'jinou měnu než CZK');
    const variableSymbol = cell(row, 'variableSymbol')?.trim() || null;
    if (variableSymbol !== null && !/^\d{1,10}$/.test(variableSymbol))
      return invalid(row.line, 'neplatný variabilní symbol');

    if (amountMinor <= 0) {
      skippedOutgoing += 1;
      continue;
    }
    // A movement listed twice in one file is one movement.
    if (seen.has(id)) continue;
    seen.add(id);

    const account = optional(cell(row, 'account'), 50);
    const bankCode = optional(cell(row, 'bankCode'), 9);
    transactions.push({
      bankTransactionId: id,
      bookedOn,
      amountMinor,
      variableSymbol,
      counterpartyAccount: account
        ? (bankCode ? `${account}/${bankCode}` : account).slice(0, 60)
        : null,
      counterpartyName: optional(cell(row, 'name'), 200),
      message:
        optional(cell(row, 'message'), 500) ?? optional(cell(row, 'note'), 500),
    });
  }
  return { ok: true, statement: { transactions, skippedOutgoing } };
};
