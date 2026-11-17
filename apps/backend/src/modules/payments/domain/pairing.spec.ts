import {
  normalizeVariableSymbol,
  pairByVariableSymbol,
} from '@/modules/payments/domain/pairing';

describe('normalizeVariableSymbol', () => {
  it.each([
    ['1000123', '1000123'],
    ['0001000123', '1000123'],
    ['0', '0'],
    ['000', '0'],
  ])('%s is %s', (symbol, normalized) => {
    expect(normalizeVariableSymbol(symbol)).toBe(normalized);
  });
});

describe('pairByVariableSymbol', () => {
  const candidates = [
    { id: 'anna', variableSymbol: '1000001' },
    { id: 'jakub', variableSymbol: '1000002' },
  ];

  it('pairs a transaction with the one registration of its symbol', () => {
    expect(
      pairByVariableSymbol(
        [{ id: 't1', variableSymbol: '1000002' }],
        candidates,
      ),
    ).toEqual([{ transactionId: 't1', registrationId: 'jakub' }]);
  });

  it('ignores leading zeros of the bank', () => {
    expect(
      pairByVariableSymbol(
        [{ id: 't1', variableSymbol: '0001000001' }],
        candidates,
      ),
    ).toEqual([{ transactionId: 't1', registrationId: 'anna' }]);
  });

  it('leaves a transaction without a symbol or without a match unpaired', () => {
    expect(
      pairByVariableSymbol(
        [
          { id: 't1', variableSymbol: null },
          { id: 't2', variableSymbol: '9999999' },
        ],
        candidates,
      ),
    ).toEqual([]);
  });

  it('leaves an ambiguous symbol unpaired', () => {
    expect(
      pairByVariableSymbol(
        [{ id: 't1', variableSymbol: '1000001' }],
        [...candidates, { id: 'other', variableSymbol: '01000001' }],
      ),
    ).toEqual([]);
  });

  it('pairs several transactions with the same registration', () => {
    expect(
      pairByVariableSymbol(
        [
          { id: 't1', variableSymbol: '1000001' },
          { id: 't2', variableSymbol: '1000001' },
        ],
        candidates,
      ).map((pairing) => pairing.transactionId),
    ).toEqual(['t1', 't2']);
  });
});
