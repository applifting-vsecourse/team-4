import {
  hashToken,
  isExpired,
  isWellFormedToken,
  newToken,
  withinLimitWindow,
} from './participant-access';

describe('participant access tokens', () => {
  it('issues well-formed, unique tokens', () => {
    const a = newToken();
    expect(isWellFormedToken(a)).toBe(true);
    expect(newToken()).not.toBe(a);
  });

  it('rejects malformed tokens', () => {
    expect(isWellFormedToken('')).toBe(false);
    expect(isWellFormedToken('short')).toBe(false);
    expect(isWellFormedToken(`${newToken()}x`)).toBe(false);
    expect(isWellFormedToken(`${newToken().slice(1)}!`)).toBe(false);
  });

  it('hashes to 64 hex characters and never to the token itself', () => {
    const token = newToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
  });
});

describe('expiry', () => {
  const now = new Date('2027-01-01T10:00:00.000Z');

  it('is no longer valid at the very moment of expiresAt', () => {
    expect(isExpired(new Date(now.getTime()), now)).toBe(true);
    expect(isExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });

  it('opens the limit window 15 minutes back', () => {
    expect(withinLimitWindow(now).toISOString()).toBe(
      '2027-01-01T09:45:00.000Z',
    );
  });
});
