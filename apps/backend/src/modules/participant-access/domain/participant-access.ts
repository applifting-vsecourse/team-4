import { createHash, randomBytes } from 'node:crypto';

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** At most this many links per account in any window of `LINK_LIMIT_WINDOW_MS`. */
export const LINK_LIMIT = 3;
export const LINK_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const PARTICIPANT_SESSION_COOKIE = 'akcio_participant_session';

/** Shown for a known and an unknown e-mail alike, also when the limit is hit. */
export const LINK_REQUESTED_MESSAGE =
  'Pokud k tomuto e-mailu existují přihlášky, pošleme vám přihlašovací odkaz.';

/** A random secret for a link or a session; only its hash is ever stored. */
export const newToken = (): string => randomBytes(32).toString('base64url');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Tokens are `newToken()` output; anything else cannot match a stored hash. */
export const isWellFormedToken = (token: string): boolean =>
  /^[A-Za-z0-9_-]{43}$/.test(token);

export const isExpired = (expiresAt: Date, now: Date): boolean =>
  expiresAt.getTime() <= now.getTime();

export const withinLimitWindow = (now: Date): Date =>
  new Date(now.getTime() - LINK_LIMIT_WINDOW_MS);

/** The verified identity handed to every participant-only endpoint. */
export class ParticipantIdentity {
  constructor(
    public readonly accountId: string,
    public readonly email: string,
  ) {}
}
