import {
  parseCsv,
  parseStatement,
  parseStatementAmount,
  parseStatementDate,
} from '@/modules/payments/domain/bank-statement';

const HEADER =
  '"ID operace";"Datum";"Objem";"Měna";"Protiúčet";"Název protiúčtu";"Kód banky";"Název banky";"KS";"VS";"SS";"Poznámka";"Zpráva pro příjemce";"Typ";"Provedl";"Upřesnění";"Komentář";"BIC";"ID pokynu"';

const PREAMBLE = [
  '"Výpis č. 3/2027 z účtu ""2001234567/2010""";',
  '"Období: 01.03.2027 - 31.03.2027";',
  '"Počáteční stav účtu k 01.03.2027: 10 000,00 CZK";',
  '"Koncový stav účtu k 31.03.2027: 13 000,00 CZK";',
  '"";',
];

const statement = (...rows: string[]): Uint8Array =>
  new TextEncoder().encode([...PREAMBLE, HEADER, ...rows].join('\r\n'));

const row = (
  id: string,
  date: string,
  amount: string,
  options: { vs?: string; currency?: string; message?: string } = {},
): string =>
  [
    id,
    date,
    amount,
    options.currency ?? 'CZK',
    '123456789',
    'Jan Novák',
    '0100',
    'Komerční banka, a.s.',
    '',
    options.vs ?? '',
    '',
    'Platba',
    options.message ?? '',
    'Bezhotovostní příjem',
    '',
    '',
    '',
    '',
    '',
  ]
    .map((cell) => `"${cell.replace(/"/g, '""')}"`)
    .join(';');

describe('parseStatement', () => {
  it('keeps the amounts, variable symbols and dates of incoming movements', () => {
    const result = parseStatement(
      statement(
        row('26001', '02.03.2027', '1500,00', { vs: '1001', message: 'Tábor' }),
        row('26002', '15.03.2027', '1 250,50', { vs: '1002' }),
      ),
    );
    expect(result).toEqual({
      ok: true,
      statement: {
        skippedOutgoing: 0,
        transactions: [
          {
            bankTransactionId: '26001',
            bookedOn: '2027-03-02',
            amountMinor: 150000,
            variableSymbol: '1001',
            counterpartyAccount: '123456789/0100',
            counterpartyName: 'Jan Novák',
            message: 'Tábor',
          },
          {
            bankTransactionId: '26002',
            bookedOn: '2027-03-15',
            amountMinor: 125050,
            variableSymbol: '1002',
            counterpartyAccount: '123456789/0100',
            counterpartyName: 'Jan Novák',
            message: 'Platba',
          },
        ],
      },
    });
  });

  it('counts outgoing movements without importing them', () => {
    const result = parseStatement(
      statement(
        row('26001', '02.03.2027', '-300,00'),
        row('26002', '03.03.2027', '200,00'),
      ),
    );
    expect(result.ok && result.statement.skippedOutgoing).toBe(1);
    expect(result.ok && result.statement.transactions).toHaveLength(1);
  });

  it('reads an empty statement as zero movements', () => {
    expect(parseStatement(statement())).toEqual({
      ok: true,
      statement: { transactions: [], skippedOutgoing: 0 },
    });
  });

  it('keeps a movement listed twice in the file once', () => {
    const result = parseStatement(
      statement(
        row('26001', '02.03.2027', '100,00'),
        row('26001', '02.03.2027', '100,00'),
      ),
    );
    expect(result.ok && result.statement.transactions).toHaveLength(1);
  });

  it('reads the Windows code page', () => {
    // "Měna" and "Název protiúčtu" in windows-1250: ě = 0xEC, ú = 0xFA.
    const text = `"ID pohybu";"Datum";"Objem";"Měna";"Název protiúčtu"\r\n"1";"1.3.2027";"10";"CZK";"Příjemce"`;
    const bytes = Uint8Array.from(
      [...text].map(
        (char) =>
          ({ ě: 0xec, á: 0xe1, ú: 0xfa, č: 0xe8, ř: 0xf8, í: 0xed })[char] ??
          char.charCodeAt(0),
      ),
    );
    const result = parseStatement(bytes);
    expect(result.ok && result.statement.transactions[0]).toMatchObject({
      bookedOn: '2027-03-01',
      amountMinor: 1000,
      counterpartyName: 'Příjemce',
    });
  });

  it('rejects a file that is not a statement', () => {
    expect(
      parseStatement(new TextEncoder().encode('jméno,příjmení\nJan,Novák')),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'statement_format' }),
    });
    expect(parseStatement(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'statement_format' }),
    });
  });

  it.each([
    ['an invalid date', row('1', '31.02.2027', '100,00'), 'neplatné datum'],
    ['an invalid amount', row('1', '01.03.2027', '12,3x'), 'neplatnou částku'],
    [
      'a foreign currency',
      row('1', '01.03.2027', '100,00', { currency: 'EUR' }),
      'jinou měnu',
    ],
    [
      'an invalid variable symbol',
      row('1', '01.03.2027', '100,00', { vs: 'ABC' }),
      'neplatný variabilní symbol',
    ],
    ['a missing id', row('', '01.03.2027', '100,00'), 'neplatné ID pohybu'],
  ])('rejects the whole statement for %s, naming the line', (_, bad, what) => {
    const result = parseStatement(
      statement(row('2', '01.03.2027', '100,00'), bad),
    );
    expect(result.ok).toBe(false);
    // Five preamble lines, the header, one good row: the bad one is line 8.
    expect(!result.ok && result.error).toEqual({
      code: 'statement_invalid',
      message: expect.stringContaining(`Řádek 8 výpisu obsahuje ${what}`),
    });
  });
});

describe('parseCsv', () => {
  it('keeps separators, quotes and line breaks inside quoted values', () => {
    expect(parseCsv('"a;b";"say ""hi""";"x\ny"\nlast')).toEqual([
      { line: 1, cells: ['a;b', 'say "hi"', 'x\ny'] },
      { line: 3, cells: ['last'] },
    ]);
  });
});

describe('parseStatementDate', () => {
  it.each([
    ['02.03.2027', '2027-03-02'],
    ['2.3.2027', '2027-03-02'],
    ['29.02.2028', '2028-02-29'],
  ])('reads %s', (value, expected) => {
    expect(parseStatementDate(value)).toBe(expected);
  });

  it.each(['29.02.2027', '2027-03-02', '32.01.2027', ''])(
    'rejects %s',
    (value) => {
      expect(parseStatementDate(value)).toBeNull();
    },
  );
});

describe('parseStatementAmount', () => {
  it.each([
    ['1500,00', 150000],
    ['1 500,5', 150050],
    ['1 500,00', 150000],
    ['-250,00', -25000],
    ['+10', 1000],
    ['99.99', 9999],
  ])('reads %s', (value, expected) => {
    expect(parseStatementAmount(value)).toBe(expected);
  });

  it.each(['', '1,234,00', '12,345', 'abc', '99999999999'])(
    'rejects %s',
    (value) => {
      expect(parseStatementAmount(value)).toBeNull();
    },
  );
});
