/** Payment instructions for registrations received from now on (S2-09). */
export type PaymentSettings = {
  /** 1–6 digits, null without a prefix. */
  bankAccountPrefix: string | null;
  /** 2–10 digits. */
  bankAccountNumber: string;
  /** 4 digits. */
  bankCode: string;
  /** Positive whole number of days. */
  paymentDueDays: number;
};

/**
 * Not a business rule: the story sets no upper bound. It is the largest value
 * the 32-bit `paymentDueDays` column can hold, so a larger one would fail in
 * the database instead of at the field.
 */
export const MAX_PAYMENT_DUE_DAYS = 2_147_483_647;

export type AccountField = 'bankAccountPrefix' | 'bankAccountNumber';

// Weights of the ČNB mod-11 check, from the rightmost digit: the last digit
// always has weight 1, so a shorter number is the same as one padded with
// leading zeros (123457 = 0000123457). The prefix is checked the same way.
const WEIGHTS = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];

const hasValidChecksum = (digits: string): boolean => {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    const weight = WEIGHTS[digits.length - 1 - index];
    sum += Number(digits[index]) * weight;
  }
  return sum % 11 === 0;
};

/**
 * Format and checksum of a Czech account number and its optional prefix
 * (ČNB rules for CERTIS, annex 1). Whether the account exists is not checked.
 * Returns the offending field, or null for a valid account.
 */
export const findInvalidAccountField = (
  prefix: string | null,
  number: string,
): AccountField | null => {
  if (prefix !== null && !hasValidChecksum(prefix)) return 'bankAccountPrefix';
  // The number needs at least two non-zero digits.
  const nonZeroDigits = number.replace(/0/g, '').length;
  if (nonZeroDigits < 2 || !hasValidChecksum(number)) {
    return 'bankAccountNumber';
  }
  return null;
};
