/** The token is two UUIDs without dashes: 64 lowercase hex characters. */
export const PAYMENT_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export type QrPaymentCheck = 'ok' | 'nothing_to_pay' | 'debt_reduced';

/**
 * Whether `amountMinor` may be recorded against the current balance (F21-1).
 * The same rule runs when the payment is saved, so a debt that dropped in
 * the meantime, or two payments at once, can never overshoot it.
 */
export const checkQrPayment = (
  balanceMinor: number,
  amountMinor: number,
): QrPaymentCheck => {
  if (balanceMinor <= 0) return 'nothing_to_pay';
  return amountMinor > balanceMinor ? 'debt_reduced' : 'ok';
};
