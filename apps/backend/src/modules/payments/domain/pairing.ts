/** A transaction of the event's queue, as pairing reads it. */
export type UnpairedTransaction = { id: string; variableSymbol: string | null };

/** A registration of the same event that a transaction may belong to. */
export type PairingCandidate = { id: string; variableSymbol: string };

export type Pairing = { transactionId: string; registrationId: string };

/**
 * A variable symbol is a number: banks may pad it with leading zeros, so
 * „0001000123“ and „1000123“ are the same symbol.
 */
export const normalizeVariableSymbol = (symbol: string): string =>
  symbol.replace(/^0+(?=\d)/, '');

/**
 * Pairs each transaction whose variable symbol names exactly one registration
 * of the event (F24). Candidates come from the transaction's own event only,
 * so a symbol of another event's registration finds no match. A transaction
 * without a symbol, without a match or with several matches stays unpaired.
 */
export const pairByVariableSymbol = (
  transactions: readonly UnpairedTransaction[],
  candidates: readonly PairingCandidate[],
): Pairing[] => {
  const bySymbol = new Map<string, string[]>();
  for (const candidate of candidates) {
    const symbol = normalizeVariableSymbol(candidate.variableSymbol);
    bySymbol.set(symbol, [...(bySymbol.get(symbol) ?? []), candidate.id]);
  }
  return transactions.flatMap((transaction) => {
    if (transaction.variableSymbol === null) return [];
    const matches = bySymbol.get(
      normalizeVariableSymbol(transaction.variableSymbol),
    );
    return matches?.length === 1
      ? [{ transactionId: transaction.id, registrationId: matches[0] }]
      : [];
  });
};
