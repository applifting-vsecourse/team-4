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
});
