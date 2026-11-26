/**
 * What a participant is told about money (S5-02): one rule for the app and
 * the e-mails. Only confirmed terms create a payment obligation; the price of
 * waiting or waitlisted terms is never presented as something to pay.
 */
export type PaymentOverview =
  /** Every term released; money already paid is an overpayment. */
  | { kind: 'cancelled'; overpaidMinor: number }
  /** Nothing confirmed yet: the price is preliminary and nothing is to be paid. */
  | { kind: 'preliminary'; priceMinor: number; overpaidMinor: number }
  /** At least one confirmed term: the obligation, the payments and the rest. */
  | {
      kind: 'confirmed';
      dueMinor: number;
      paidMinor: number;
      /** Positive a debt; never negative. */
      remainingMinor: number;
      overpaidMinor: number;
    };

export const paymentOverview = (input: {
  terms: readonly { status: string }[];
  selectedPriceMinor: number;
  dueMinor: number;
  paidMinor: number;
}): PaymentOverview => {
  const balance = input.dueMinor - input.paidMinor;
  const overpaidMinor = Math.max(-balance, 0);
  const selected = input.terms.filter((term) => term.status !== 'cancelled');
  if (selected.length === 0) return { kind: 'cancelled', overpaidMinor };
  if (!selected.some((term) => term.status === 'confirmed')) {
    return {
      kind: 'preliminary',
      priceMinor: input.selectedPriceMinor,
      overpaidMinor,
    };
  }
  return {
    kind: 'confirmed',
    dueMinor: input.dueMinor,
    paidMinor: input.paidMinor,
    remainingMinor: Math.max(balance, 0),
    overpaidMinor,
  };
};
