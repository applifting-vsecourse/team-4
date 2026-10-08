import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';

export const getSessionFromRequest = async (
  req: Request,
  betterAuth: BetterAuth,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return betterAuth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
};
