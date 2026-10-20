import { findInvalidAccountField } from './payment-settings';

describe('findInvalidAccountField', () => {
  it('accepts an account with a prefix', () => {
    expect(findInvalidAccountField('19', '2000145399')).toBeNull();
  });

  it('accepts an account without a prefix', () => {
    expect(findInvalidAccountField(null, '123457')).toBeNull();
  });

  it('rejects a number with a wrong checksum', () => {
    expect(findInvalidAccountField(null, '123456')).toBe('bankAccountNumber');
  });

  it('rejects a prefix with a wrong checksum', () => {
    expect(findInvalidAccountField('20', '2000145399')).toBe(
      'bankAccountPrefix',
    );
  });

  it('rejects a number with fewer than two non-zero digits', () => {
    expect(findInvalidAccountField(null, '0000000010')).toBe(
      'bankAccountNumber',
    );
  });

  // The ČNB table gives the weights left to right for a 10-digit number.
  const padded = (digits: string): boolean => {
    const weights = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];
    const sum = [...digits.padStart(10, '0')].reduce(
      (total, digit, index) => total + Number(digit) * weights[index],
      0,
    );
    return sum % 11 === 0;
  };

  it('agrees with the 10-digit weights for numbers of every length', () => {
    for (let length = 2; length <= 10; length++) {
      for (let seed = 1; seed <= 400; seed++) {
        const digits = String((seed * 7919) % 10 ** length).padStart(
          length,
          '0',
        );
        if (digits.replace(/0/g, '').length < 2) continue;
        expect(findInvalidAccountField(null, digits) === null).toBe(
          padded(digits),
        );
      }
    }
  });
});
