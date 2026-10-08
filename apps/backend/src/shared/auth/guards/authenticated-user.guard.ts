import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(@InjectBetterAuth private readonly betterAuth: BetterAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const session = await getSessionFromRequest(request, this.betterAuth);

    if (!session) {
      // 401: the caller is not signed in (403 would mean "signed in but not allowed")
      throw new UnauthorizedException();
    }

    request.session = session;
    return true;
  }
}
