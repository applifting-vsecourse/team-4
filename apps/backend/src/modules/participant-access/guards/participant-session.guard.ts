import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export type ParticipantRequest = Request & {
  participant?: ParticipantIdentity;
};

/**
 * The common contract for participant-only endpoints (S2-13, used by S2-14):
 * without a valid session nothing runs and the answer is 401
 * `participant_session_required`. Organizer sign-in does not satisfy it, and
 * this session does not satisfy the organizer guard.
 */
@Injectable()
export class ParticipantSessionGuard implements CanActivate {
  constructor(private readonly access: ParticipantAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ParticipantRequest>();
    const cookies = request.cookies as Record<string, string> | undefined;
    const identity = await this.access.identify(
      cookies?.[PARTICIPANT_SESSION_COOKIE],
    );
    if (!identity) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'participant_session_required',
        message: 'Přihlaste se odkazem z e-mailu. Můžete si vyžádat nový.',
      });
    }
    request.participant = identity;
    return true;
  }
}

/** The verified participant; use together with `ParticipantSessionGuard`. */
export const CurrentParticipant = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<ParticipantRequest>().participant,
);
